import { IsString, IsOptional, IsEnum, IsNumber } from "class-validator";
import type { AssetKind, AssetProcessingStatus } from "@flow2print/domain";

export class CreateAssetUploadIntentDto {
  @IsString()
  filename!: string;

  @IsOptional()
  @IsEnum(["image", "svg", "pdf", "font", "technical"])
  kind?: AssetKind;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsNumber()
  sizeBytes!: number;
}

export class ConfirmAssetUploadDto {
  @IsOptional()
  @IsNumber()
  widthPx?: number | null;

  @IsOptional()
  @IsNumber()
  heightPx?: number | null;

  @IsOptional()
  @IsNumber()
  dpiX?: number | null;

  @IsOptional()
  @IsNumber()
  dpiY?: number | null;

  @IsOptional()
  @IsString()
  colorSpace?: string | null;

  @IsOptional()
  @IsString()
  iccProfileRef?: string | null;
}

export class CreateAssetDto {
  @IsString()
  filename!: string;

  @IsOptional()
  @IsEnum(["image", "svg", "pdf", "font", "technical"])
  kind?: AssetKind;

  @IsOptional()
  @IsEnum(["pending", "processing", "ready", "failed"])
  status?: AssetProcessingStatus;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  originalObjectKey?: string | null;

  @IsOptional()
  @IsString()
  normalizedObjectKey?: string | null;

  @IsOptional()
  @IsNumber()
  sizeBytes?: number | null;

  @IsOptional()
  @IsNumber()
  widthPx?: number | null;

  @IsOptional()
  @IsNumber()
  heightPx?: number | null;

  @IsOptional()
  @IsNumber()
  dpiX?: number | null;

  @IsOptional()
  @IsNumber()
  dpiY?: number | null;

  @IsOptional()
  @IsString()
  colorSpace?: string | null;

  @IsOptional()
  @IsString()
  iccProfileRef?: string | null;

  @IsOptional()
  @IsString()
  sha256?: string | null;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsEnum(["image", "svg", "pdf", "font", "technical"])
  kind?: AssetKind;

  @IsOptional()
  @IsEnum(["pending", "processing", "ready", "failed"])
  status?: AssetProcessingStatus;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  originalObjectKey?: string | null;

  @IsOptional()
  @IsString()
  normalizedObjectKey?: string | null;

  @IsOptional()
  @IsNumber()
  sizeBytes?: number | null;

  @IsOptional()
  @IsNumber()
  widthPx?: number | null;

  @IsOptional()
  @IsNumber()
  heightPx?: number | null;

  @IsOptional()
  @IsNumber()
  dpiX?: number | null;

  @IsOptional()
  @IsNumber()
  dpiY?: number | null;

  @IsOptional()
  @IsString()
  colorSpace?: string | null;

  @IsOptional()
  @IsString()
  iccProfileRef?: string | null;

  @IsOptional()
  @IsString()
  sha256?: string | null;
}
