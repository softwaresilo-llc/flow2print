import { SetMetadata } from "@nestjs/common";
import type { ApiTokenScope } from "@flow2print/domain";

export const SCOPES_KEY = "scopes";
export const Scopes = (...scopes: ApiTokenScope[]) =>
  SetMetadata(SCOPES_KEY, scopes);
