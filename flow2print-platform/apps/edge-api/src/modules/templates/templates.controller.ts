import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { AdminGuard } from "../../common/guards/auth.guard.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { CreateTemplateDto, UpdateTemplateDto } from "./dto/templates.dto.js";

@ApiTags("templates")
@Controller("v1/templates")
@ApiBearerAuth()
export class TemplatesController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List all templates" })
  async list(@Query("blueprintId") blueprintId?: string) {
    const templates = await this.store.instance.getTemplates();
    return {
      docs: blueprintId
        ? templates.filter((t) => t.blueprintId === blueprintId)
        : templates,
    };
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Create template (admin only)" })
  async create(@Body() body: CreateTemplateDto) {
    return this.store.instance.createTemplate({
      displayName: body.displayName,
      description: body.description,
      blueprintId: body.blueprintId,
      status: body.status,
    });
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Update template (admin only)" })
  async update(@Param("id") id: string, @Body() body: UpdateTemplateDto) {
    const template = await this.store.instance.updateTemplate(id, body);
    if (!template) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "template_not_found" };
    }
    return template;
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Delete template (admin only)" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteTemplate(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "template_not_found" };
    }
    return { ok: true };
  }
}
