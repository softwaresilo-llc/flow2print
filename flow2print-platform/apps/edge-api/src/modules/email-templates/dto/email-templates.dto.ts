import { IsString, IsOptional, IsEnum } from "class-validator";
import type { EmailTemplateKind } from "@flow2print/domain";

export class CreateEmailTemplateDto {
  @IsString()
  label!: string;

  @IsEnum(["password_reset"])
  kind!: EmailTemplateKind;

  @IsString()
  subject!: string;

  @IsString()
  bodyHtml!: string;

  @IsString()
  previewText!: string;

  @IsString()
  wrapperHeaderHtml!: string;

  @IsString()
  wrapperFooterHtml!: string;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsEnum(["password_reset"])
  kind?: EmailTemplateKind;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsString()
  previewText?: string;

  @IsOptional()
  @IsString()
  wrapperHeaderHtml?: string;

  @IsOptional()
  @IsString()
  wrapperFooterHtml?: string;
}

export class PreviewEmailTemplateDto {
  @IsString()
  subject!: string;

  @IsString()
  bodyHtml!: string;

  @IsString()
  previewText!: string;

  @IsString()
  wrapperHeaderHtml!: string;

  @IsString()
  wrapperFooterHtml!: string;

  @IsOptional()
  settings?: {
    brandName?: string;
    companyName?: string;
    companyAddress?: string;
    supportEmail?: string;
    mailFromName?: string;
    mailFromAddress?: string;
    primaryColor?: string;
    logoText?: string;
    portalAppUrl?: string;
    designerAppUrl?: string;
    adminAppUrl?: string;
    commerceBaseUrl?: string;
    defaultLocale?: string;
    defaultTimezone?: string;
  };

  @IsOptional()
  variables?: {
    recipientEmail?: string;
    resetToken?: string;
  };
}
