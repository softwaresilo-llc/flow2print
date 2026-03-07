import { IsString, IsOptional } from "class-validator";

export class CreateQuoteLinkDto {
  @IsString()
  projectId!: string;

  @IsString()
  externalQuoteRef!: string;

  @IsOptional()
  @IsString()
  externalStoreId?: string;

  @IsOptional()
  @IsString()
  externalProductRef?: string;

  @IsOptional()
  @IsString()
  externalCustomerRef?: string | null;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class CreateOrderLinkDto {
  @IsString()
  projectId!: string;

  @IsString()
  externalOrderRef!: string;

  @IsOptional()
  @IsString()
  externalStoreId?: string;

  @IsOptional()
  @IsString()
  externalProductRef?: string;

  @IsOptional()
  @IsString()
  externalCustomerRef?: string | null;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class ReorderDto {
  @IsString()
  projectId!: string;
}
