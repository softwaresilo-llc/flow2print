import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type {
  AuthContext,
  SessionWithUser,
} from "../interfaces/auth-context.js";

export const CurrentAuth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.auth ?? null;
  },
);

export const CurrentSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SessionWithUser | null => {
    const request = ctx.switchToHttp().getRequest();
    const auth = request.auth as AuthContext;
    if (auth?.kind === "session") {
      return auth.session;
    }
    return null;
  },
);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const auth = request.auth as AuthContext;
    if (auth?.kind === "session") {
      return auth.session.user;
    }
    return null;
  },
);
