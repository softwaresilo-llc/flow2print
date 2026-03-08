import { IsEnum, IsOptional, IsString } from "class-validator";
import type { FontFamilyRecord } from "@flow2print/domain";

export class CreateFontFamilyDto {
  @IsString()
  familyKey!: string;

  @IsString()
  displayName!: string;

  @IsEnum(["upload", "system", "google_cache"])
  source!: FontFamilyRecord["source"];

  @IsOptional()
  @IsEnum(["active", "disabled"])
  status?: FontFamilyRecord["status"];
}

export class UpdateFontFamilyDto {
  @IsOptional()
  @IsString()
  familyKey?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEnum(["upload", "system", "google_cache"])
  source?: FontFamilyRecord["source"];

  @IsOptional()
  @IsEnum(["active", "disabled"])
  status?: FontFamilyRecord["status"];
}
