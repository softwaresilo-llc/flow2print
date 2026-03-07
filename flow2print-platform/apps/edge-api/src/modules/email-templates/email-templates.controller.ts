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
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
} from "./dto/email-templates.dto.js";

@ApiTags("email-templates")
@Controller("v1/email-templates")
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class EmailTemplatesController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "List all email templates (admin only)" })
  async list() {
    return { docs: await this.store.instance.listEmailTemplates() };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get email template by ID (admin only)" })
  async get(@Param("id") id: string) {
    const record = await this.store.instance.getEmailTemplate(id);
    if (!record) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: "email_template_not_found",
      };
    }
    return record;
  }

  @Post()
  @ApiOperation({ summary: "Create email template (admin only)" })
  async create(@Body() body: CreateEmailTemplateDto) {
    return this.store.instance.createEmailTemplate({
      label: body.label,
      kind: body.kind,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      previewText: body.previewText,
      wrapperHeaderHtml: body.wrapperHeaderHtml,
      wrapperFooterHtml: body.wrapperFooterHtml,
    });
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update email template (admin only)" })
  async update(@Param("id") id: string, @Body() body: UpdateEmailTemplateDto) {
    const template = await this.store.instance.updateEmailTemplate(id, body);
    if (!template) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: "email_template_not_found",
      };
    }
    return template;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete email template (admin only)" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteEmailTemplate(id);
    if (!deleted) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: "email_template_not_found",
      };
    }
    return { ok: true };
  }

  @Get(":id/preview")
  @ApiOperation({ summary: "Preview email template (admin only)" })
  async preview(@Param("id") id: string) {
    const preview = await this.store.instance.getEmailPreview(id);
    if (!preview) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: "email_template_not_found",
      };
    }
    return preview;
  }

  @Post("preview")
  @ApiOperation({ summary: "Preview email with custom content (admin only)" })
  async previewCustom(@Body() body: PreviewEmailTemplateDto) {
    return this.store.instance.previewEmailTemplate({
      template: {
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        previewText: body.previewText,
        wrapperHeaderHtml: body.wrapperHeaderHtml,
        wrapperFooterHtml: body.wrapperFooterHtml,
      },
      settings: body.settings,
      recipientEmail: body.variables?.recipientEmail,
      resetToken: body.variables?.resetToken,
    });
  }
}
