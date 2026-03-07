import { IsString, IsOptional, IsEnum, IsNumber } from "class-validator";
import type { AssetKind } from "@flow2print/domain";

export class CreateAssetDto {
  @IsString()
  filename!: string;

  @IsOptional()
  @IsEnum(["image", "svg", "pdf", "font", "technical"])
  kind?: AssetKind;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  widthPx?: number | null;

  @IsOptional()
  @IsNumber()
  heightPx?: number | null;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsEnum(["image", "svg", "pdf", "font", "technical"])
  kind?: AssetKind;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  widthPx?: number | null;

  @IsOptional()
  @IsNumber()
  heightPx?: number | null;
}
