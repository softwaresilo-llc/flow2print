import type {
  ApiTokenRecord,
  AuthSessionRecord,
  UserRecord,
} from "@flow2print/domain";

export type { UserRole } from "@flow2print/domain";

export interface SessionWithUser {
  user: UserRecord;
  session: AuthSessionRecord;
}

export interface SessionAuthContext {
  kind: "session";
  session: SessionWithUser;
}

export interface ApiTokenAuthContext {
  kind: "api-token";
  apiToken: ApiTokenRecord;
}

export type AuthContext = SessionAuthContext | ApiTokenAuthContext | null;
