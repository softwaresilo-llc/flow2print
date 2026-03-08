import { IsEnum, IsOptional, IsString } from "class-validator";
import type { FontFileRecord } from "@flow2print/domain";

export class CreateFontFileDto {
  @IsString()
  fontFamilyId!: string;

  @IsOptional()
  @IsString()
  assetId?: string | null;

  @IsString()
  fileKey!: string;

  @IsEnum(["ttf", "otf", "woff", "woff2"])
  format!: FontFileRecord["format"];

  @IsOptional()
  @IsString()
  weight?: string | null;

  @IsOptional()
  @IsString()
  style?: string | null;
}

export class UpdateFontFileDto {
  @IsOptional()
  @IsString()
  fontFamilyId?: string;

  @IsOptional()
  @IsString()
  assetId?: string | null;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsOptional()
  @IsEnum(["ttf", "otf", "woff", "woff2"])
  format?: FontFileRecord["format"];

  @IsOptional()
  @IsString()
  weight?: string | null;

  @IsOptional()
  @IsString()
  style?: string | null;
}
