import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { CreateFontFamilyDto, UpdateFontFamilyDto } from "./dto/font-families.dto.js";

@ApiTags("font-families")
@Controller("v1/font-families")
@ApiBearerAuth()
export class FontFamiliesController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "List font families" })
  async list() {
    return { docs: await this.store.instance.listFontFamilies() };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get font family" })
  async getOne(@Param("id") id: string) {
    const record = await this.store.instance.getFontFamily(id);
    if (!record) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "font_family_not_found" };
    }
    return record;
  }

  @Post()
  @ApiOperation({ summary: "Create font family" })
  async create(@Body() body: CreateFontFamilyDto) {
    return this.store.instance.createFontFamily(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update font family" })
  async update(@Param("id") id: string, @Body() body: UpdateFontFamilyDto) {
    const record = await this.store.instance.updateFontFamily(id, body);
    if (!record) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "font_family_not_found" };
    }
    return record;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete font family" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteFontFamily(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "font_family_not_found" };
    }
    return { ok: true };
  }
}
