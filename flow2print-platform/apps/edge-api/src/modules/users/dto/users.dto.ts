import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from "class-validator";
import type { UserRole } from "@flow2print/domain";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  displayName!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsEnum(["admin", "manager", "customer"])
  role?: UserRole;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  password?: string;

  @IsOptional()
  @IsEnum(["admin", "manager", "customer"])
  role?: UserRole;

  @IsOptional()
  @IsEnum(["active", "disabled"])
  status?: "active" | "disabled";
}
