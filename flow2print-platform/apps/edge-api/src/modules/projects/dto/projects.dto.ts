import { IsString, IsOptional, IsEnum } from "class-validator";
import type { ProjectStatus } from "@flow2print/domain";

export class CreateProjectDto {
  @IsString()
  title!: string;

  @IsString()
  blueprintId!: string;

  @IsOptional()
  @IsString()
  templateId?: string | null;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(["draft", "finalized", "ordered", "archived"])
  status?: ProjectStatus;
}

export class AutosaveProjectDto {
  @IsOptional()
  document?: unknown;
}
