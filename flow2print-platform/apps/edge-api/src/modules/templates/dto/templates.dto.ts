import { IsString, IsOptional, IsEnum } from "class-validator";

export class CreateTemplateDto {
  @IsString()
  displayName!: string;

  @IsString()
  description!: string;

  @IsString()
  blueprintId!: string;

  @IsOptional()
  @IsEnum(["published", "draft"])
  status?: "published" | "draft";
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  blueprintId?: string;

  @IsOptional()
  @IsEnum(["published", "draft"])
  status?: "published" | "draft";
}
