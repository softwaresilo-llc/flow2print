import { IsString, IsOptional, IsArray } from "class-validator";

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  permissions?: string[];
}
