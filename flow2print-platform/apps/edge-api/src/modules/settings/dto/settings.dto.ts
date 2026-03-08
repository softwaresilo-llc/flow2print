import { IsString, IsOptional, IsLocale, IsTimeZone, IsEmail, IsInt, Min } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsEmail()
  salesEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsString()
  mailFromName?: string;

  @IsOptional()
  @IsEmail()
  mailFromAddress?: string;

  @IsOptional()
  @IsEmail()
  replyToEmail?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  logoText?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  logoAssetId?: string | null;

  @IsOptional()
  @IsString()
  portalAppUrl?: string;

  @IsOptional()
  @IsString()
  designerAppUrl?: string;

  @IsOptional()
  @IsString()
  adminAppUrl?: string;

  @IsOptional()
  @IsString()
  commerceBaseUrl?: string;

  @IsOptional()
  @IsString()
  publicApiUrl?: string;

  @IsOptional()
  @IsLocale()
  defaultLocale?: string;

  @IsOptional()
  @IsTimeZone()
  defaultTimezone?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sessionTtlHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  passwordResetTtlMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUploadMb?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  maxImageEdgePx?: number;
}
