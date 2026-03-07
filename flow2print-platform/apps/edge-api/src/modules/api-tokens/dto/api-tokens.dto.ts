import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
} from "class-validator";
import type { ApiTokenScope } from "@flow2print/domain";

export class CreateApiTokenDto {
  @IsString()
  label!: string;

  @IsArray()
  scopes!: ApiTokenScope[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class UpdateApiTokenDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  scopes?: ApiTokenScope[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsEnum(["active", "revoked"])
  status?: "active" | "revoked";
}
