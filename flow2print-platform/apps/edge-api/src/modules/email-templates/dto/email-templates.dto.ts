import { IsString, IsOptional, IsEnum } from "class-validator";
import type { EmailTemplateKind } from "@flow2print/domain";

const emailTemplateKinds: EmailTemplateKind[] = [
  "password_reset",
  "welcome_admin",
  "user_invite",
  "account_created",
  "project_finalized",
  "approval_requested"
];

export class CreateEmailTemplateDto {
  @IsString()
  label!: string;

  @IsEnum(emailTemplateKinds)
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
  @IsEnum(emailTemplateKinds)
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
    salesEmail?: string;
    supportPhone?: string;
    mailFromName?: string;
    mailFromAddress?: string;
    replyToEmail?: string;
    primaryColor?: string;
    logoText?: string;
    logoUrl?: string;
    logoAssetId?: string | null;
    portalAppUrl?: string;
    designerAppUrl?: string;
    adminAppUrl?: string;
    commerceBaseUrl?: string;
    publicApiUrl?: string;
    defaultLocale?: string;
    defaultTimezone?: string;
    defaultCurrency?: string;
    sessionTtlHours?: number;
    passwordResetTtlMinutes?: number;
    maxUploadMb?: number;
    maxImageEdgePx?: number;
  };

  @IsOptional()
  variables?: {
    recipientEmail?: string;
    resetToken?: string;
  };
}
