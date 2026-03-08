import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import type { AssetVariantKind } from "@flow2print/domain";

export class CreateAssetVariantDto {
  @IsString()
  assetId!: string;

  @IsEnum(["thumb", "web", "normalized", "woff2"])
  variantKind!: AssetVariantKind;

  @IsString()
  objectKey!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsNumber()
  widthPx?: number | null;

  @IsOptional()
  @IsNumber()
  heightPx?: number | null;

  @IsOptional()
  @IsNumber()
  byteSize?: number | null;
}

export class UpdateAssetVariantDto {
  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsEnum(["thumb", "web", "normalized", "woff2"])
  variantKind?: AssetVariantKind;

  @IsOptional()
  @IsString()
  objectKey?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  widthPx?: number | null;

  @IsOptional()
  @IsNumber()
  heightPx?: number | null;

  @IsOptional()
  @IsNumber()
  byteSize?: number | null;
}
