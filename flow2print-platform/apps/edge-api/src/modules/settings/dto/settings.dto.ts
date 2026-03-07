import { IsString, IsOptional, IsLocale, IsTimeZone } from "class-validator";

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
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  mailFromName?: string;

  @IsOptional()
  @IsString()
  mailFromAddress?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  logoText?: string;

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
  @IsLocale()
  defaultLocale?: string;

  @IsOptional()
  @IsTimeZone()
  defaultTimezone?: string;
}
