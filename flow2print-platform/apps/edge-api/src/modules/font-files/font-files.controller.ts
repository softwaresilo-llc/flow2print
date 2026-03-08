import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { CreateFontFileDto, UpdateFontFileDto } from "./dto/font-files.dto.js";

@ApiTags("font-files")
@Controller("v1/font-files")
@ApiBearerAuth()
export class FontFilesController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "List font files" })
  async list() {
    return { docs: await this.store.instance.listFontFiles() };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get font file" })
  async getOne(@Param("id") id: string) {
    const record = await this.store.instance.getFontFile(id);
    if (!record) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "font_file_not_found" };
    }
    return record;
  }

  @Post()
  @ApiOperation({ summary: "Create font file" })
  async create(@Body() body: CreateFontFileDto) {
    return this.store.instance.createFontFile(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update font file" })
  async update(@Param("id") id: string, @Body() body: UpdateFontFileDto) {
    const record = await this.store.instance.updateFontFile(id, body);
    if (!record) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "font_file_not_found" };
    }
    return record;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete font file" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteFontFile(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "font_file_not_found" };
    }
    return { ok: true };
  }
}
