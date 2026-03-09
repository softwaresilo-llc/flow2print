import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Put,
  Req,
  Res,
  StreamableFile,
  UseGuards,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { AdminGuard } from "../../common/guards/auth.guard.js";
import { Public } from "../../common/decorators/public.decorator.js";
import {
  ConfirmAssetUploadDto,
  CreateAssetDto,
  CreateAssetUploadIntentDto,
  UpdateAssetDto
} from "./dto/assets.dto.js";
import {
  buildOriginalObjectKey,
  detectAssetFormat,
  hashBufferSha256,
  isAllowedAssetKind,
  readObjectBuffer,
  writeObjectBuffer
} from "./asset-upload.js";

const buildLegacyAssetSvg = (asset: {
  filename: string;
  widthPx: number | null;
  heightPx: number | null;
}) => {
  const width = Math.max(800, asset.widthPx ?? 1200);
  const height = Math.max(500, asset.heightPx ?? 800);
  const label = asset.filename.replace(/[<&>"]/g, "");
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#edf4ff"/>
      <stop offset="100%" stop-color="#dbe7f8"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="28" fill="url(#bg)"/>
  <rect x="48" y="48" width="${width - 96}" height="${height - 96}" rx="22" fill="#ffffff" stroke="#bfd0e7" stroke-width="6"/>
  <text x="88" y="${Math.round(height * 0.34)}" fill="#2f4f83" font-size="${Math.round(width * 0.06)}" font-family="Georgia, 'Times New Roman', serif">${label}</text>
  <text x="88" y="${Math.round(height * 0.48)}" fill="#456790" font-size="${Math.round(width * 0.038)}" font-family="Arial, sans-serif">Legacy asset record without uploaded binary</text>
  <text x="88" y="${Math.round(height * 0.58)}" fill="#70839d" font-size="${Math.round(width * 0.026)}" font-family="Arial, sans-serif">Upload a real image to replace this preview.</text>
  <rect x="${Math.round(width * 0.72)}" y="70" width="${Math.round(width * 0.16)}" height="${Math.round(height * 0.68)}" rx="18" fill="#e7eef9" stroke="#c7d6ea" stroke-width="4"/>
</svg>`,
    "utf8"
  );
};

const readRequestBody = async (request: FastifyRequest) => {
  const parsedBody = request.body;
  if (Buffer.isBuffer(parsedBody)) {
    return parsedBody;
  }
  if (parsedBody instanceof Uint8Array) {
    return Buffer.from(parsedBody);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request.raw) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

@ApiTags("assets")
@Controller("v1/assets")
@ApiBearerAuth()
export class AssetsController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List all assets" })
  async list() {
    return { docs: await this.store.instance.listAssets() };
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a single asset" })
  async getOne(@Param("id") id: string) {
    const asset = await this.store.instance.getAsset(id);
    if (!asset) {
      throw new NotFoundException("asset_not_found");
    }
    return asset;
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Create asset" })
  async create(@Body() body: CreateAssetDto) {
    const asset = await this.store.instance.createAsset({
      filename: body.filename,
      kind: body.kind,
      status: body.status,
      mimeType: body.mimeType,
      originalObjectKey: body.originalObjectKey,
      normalizedObjectKey: body.normalizedObjectKey,
      sizeBytes: body.sizeBytes,
      widthPx: body.widthPx,
      heightPx: body.heightPx,
      dpiX: body.dpiX,
      dpiY: body.dpiY,
      colorSpace: body.colorSpace,
      iccProfileRef: body.iccProfileRef,
      sha256: body.sha256,
    });
    return asset;
  }

  @Post("upload-intent")
  @Public()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Create an upload intent for a new binary asset" })
  async createUploadIntent(@Body() body: CreateAssetUploadIntentDto) {
    const settings = await this.store.instance.getSystemSettings();
    if (body.sizeBytes > settings.maxUploadMb * 1024 * 1024) {
      throw new BadRequestException("asset_too_large");
    }

    const asset = await this.store.instance.createAsset({
      filename: body.filename,
      kind: body.kind,
      mimeType: body.mimeType,
      status: "pending",
      sizeBytes: body.sizeBytes,
      originalObjectKey: ""
    });
    const objectKey = buildOriginalObjectKey(asset.id, body.filename);
    const updatedAsset = await this.store.instance.updateAsset(asset.id, {
      originalObjectKey: objectKey,
      status: "pending",
      sizeBytes: body.sizeBytes,
      mimeType: body.mimeType ?? asset.mimeType
    });

    return {
      assetId: asset.id,
      objectKey,
      method: "PUT",
      uploadUrl: `/v1/assets/uploads/${asset.id}`,
      confirmUrl: `/v1/assets/${asset.id}/confirm-upload`,
      constraints: {
        maxUploadMb: settings.maxUploadMb,
        maxImageEdgePx: settings.maxImageEdgePx
      },
      asset: updatedAsset ?? asset
    };
  }

  @Put("uploads/:id")
  @Public()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Upload binary data for a pending asset" })
  async uploadBinary(@Param("id") id: string, @Req() request: FastifyRequest) {
    const asset = await this.store.instance.getAsset(id);
    if (!asset) {
      throw new NotFoundException("asset_not_found");
    }
    if (!asset.originalObjectKey) {
      throw new BadRequestException("asset_upload_intent_missing");
    }

    const settings = await this.store.instance.getSystemSettings();
    const buffer = await readRequestBody(request);
    if (!buffer.byteLength) {
      throw new BadRequestException("empty_upload");
    }
    if (buffer.byteLength > settings.maxUploadMb * 1024 * 1024) {
      throw new BadRequestException("asset_too_large");
    }

    await writeObjectBuffer(asset.originalObjectKey, buffer);
    await this.store.instance.updateAsset(id, {
      status: "processing",
      sizeBytes: buffer.byteLength
    });

    return { ok: true, bytesWritten: buffer.byteLength };
  }

  @Post(":id/confirm-upload")
  @Public()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Validate and finalize a previously uploaded asset" })
  async confirmUpload(@Param("id") id: string, @Body() body: ConfirmAssetUploadDto) {
    const asset = await this.store.instance.getAsset(id);
    if (!asset) {
      throw new NotFoundException("asset_not_found");
    }
    if (!asset.originalObjectKey) {
      throw new BadRequestException("asset_upload_intent_missing");
    }

    const settings = await this.store.instance.getSystemSettings();
    let buffer: Buffer;
    try {
      buffer = await readObjectBuffer(asset.originalObjectKey);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await this.store.instance.updateAsset(id, { status: "failed" });
        throw new BadRequestException("asset_binary_missing");
      }
      throw error;
    }
    const detected = detectAssetFormat(buffer);

    if (!isAllowedAssetKind(asset.kind, detected.kind)) {
      await this.store.instance.updateAsset(id, { status: "failed" });
      throw new BadRequestException("asset_signature_mismatch");
    }

    if ((body.widthPx ?? 0) > settings.maxImageEdgePx || (body.heightPx ?? 0) > settings.maxImageEdgePx) {
      await this.store.instance.updateAsset(id, { status: "failed" });
      throw new BadRequestException("asset_dimensions_exceed_limit");
    }

    const updated = await this.store.instance.updateAsset(id, {
      status: "ready",
      mimeType: detected.mimeType ?? asset.mimeType,
      normalizedObjectKey: asset.originalObjectKey,
      sizeBytes: buffer.byteLength,
      widthPx: body.widthPx ?? asset.widthPx,
      heightPx: body.heightPx ?? asset.heightPx,
      dpiX: body.dpiX ?? asset.dpiX,
      dpiY: body.dpiY ?? asset.dpiY,
      colorSpace: body.colorSpace ?? asset.colorSpace,
      iccProfileRef: body.iccProfileRef ?? asset.iccProfileRef,
      sha256: hashBufferSha256(buffer)
    });

    if (!updated) {
      throw new NotFoundException("asset_not_found");
    }

    return updated;
  }

  @Get(":id/file")
  @Public()
  @ApiOperation({ summary: "Stream the original uploaded file for an asset" })
  async getFile(@Param("id") id: string, @Res({ passthrough: true }) response: FastifyReply) {
    const asset = await this.store.instance.getAsset(id);
    if (!asset) {
      throw new NotFoundException("asset_not_found");
    }

    if (!asset.originalObjectKey && asset.kind === "image") {
      const buffer = buildLegacyAssetSvg(asset);
      response.header("Content-Type", "image/svg+xml; charset=utf-8");
      response.header("Content-Disposition", `inline; filename="${asset.filename.replace(/\.[^.]+$/, "")}.svg"`);
      response.header("Cache-Control", "public, max-age=300");
      return new StreamableFile(buffer);
    }
    if (!asset.originalObjectKey) {
      throw new NotFoundException("asset_file_missing");
    }

    const buffer = await readObjectBuffer(asset.originalObjectKey);
    response.header("Content-Type", asset.mimeType || "application/octet-stream");
    response.header("Content-Disposition", `inline; filename="${asset.filename}"`);
    response.header("Cache-Control", "public, max-age=300");
    return new StreamableFile(buffer);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Update asset (admin only)" })
  async update(@Param("id") id: string, @Body() body: UpdateAssetDto) {
    const asset = await this.store.instance.updateAsset(id, body);
    if (!asset) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "asset_not_found" };
    }
    return asset;
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Delete asset (admin only)" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteAsset(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "asset_not_found" };
    }
    return { ok: true };
  }
}
