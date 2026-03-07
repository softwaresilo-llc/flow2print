import { IsString, IsOptional, IsEnum } from "class-validator";
import type { BlueprintKind } from "@flow2print/domain";

export class CreateBlueprintDto {
  @IsString()
  displayName!: string;

  @IsEnum(["flat", "apparel", "packaging"])
  kind!: BlueprintKind;
}

export class UpdateBlueprintDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEnum(["flat", "apparel", "packaging"])
  kind?: BlueprintKind;
}
