import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { AdminGuard } from "../../common/guards/auth.guard.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { CreateAssetDto, UpdateAssetDto } from "./dto/assets.dto.js";

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

  @Post()
  @ApiOperation({ summary: "Create asset" })
  async create(@Body() body: CreateAssetDto) {
    const asset = await this.store.instance.createAsset({
      filename: body.filename,
      kind: body.kind,
      mimeType: body.mimeType,
      widthPx: body.widthPx,
      heightPx: body.heightPx,
    });
    return asset;
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
