import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { CreateAssetVariantDto, UpdateAssetVariantDto } from "./dto/asset-variants.dto.js";

@ApiTags("asset-variants")
@Controller("v1/asset-variants")
@ApiBearerAuth()
export class AssetVariantsController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "List asset variants" })
  async list() {
    return { docs: await this.store.instance.listAssetVariants() };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get asset variant" })
  async getOne(@Param("id") id: string) {
    const record = await this.store.instance.getAssetVariant(id);
    if (!record) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "asset_variant_not_found" };
    }
    return record;
  }

  @Post()
  @ApiOperation({ summary: "Create asset variant" })
  async create(@Body() body: CreateAssetVariantDto) {
    return this.store.instance.createAssetVariant(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update asset variant" })
  async update(@Param("id") id: string, @Body() body: UpdateAssetVariantDto) {
    const record = await this.store.instance.updateAssetVariant(id, body);
    if (!record) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "asset_variant_not_found" };
    }
    return record;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete asset variant" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteAssetVariant(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "asset_variant_not_found" };
    }
    return { ok: true };
  }
}
