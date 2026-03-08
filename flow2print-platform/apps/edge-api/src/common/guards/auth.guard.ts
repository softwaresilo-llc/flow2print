import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import type { AuthContext } from "../interfaces/auth-context.js";
import type { UserRole, ApiTokenScope } from "@flow2print/domain";
import { ROLES_KEY } from "../decorators/roles.decorator.js";
import { SCOPES_KEY } from "../decorators/scopes.decorator.js";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";

const getBearerToken = (authorizationHeader?: string): string | null =>
  authorizationHeader?.replace(/^Bearer\s+/i, "").trim() ?? null;

const scopeIncludes = (
  ownedScopes: string[],
  requiredScopes: string[],
): boolean => requiredScopes.some((scope) => ownedScopes.includes(scope));

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly store: RuntimeStoreService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const token = getBearerToken(authorization);

    if (!token) {
      throw new UnauthorizedException({ code: "auth_required" });
    }

    const session = await this.store.instance.getUserBySessionToken(token);
    if (session) {
      request.auth = { kind: "session", session };
      return true;
    }

    const apiToken = await this.store.instance.getApiTokenBySecret(token);
    if (apiToken) {
      request.auth = { kind: "api-token", apiToken };
      return true;
    }

    throw new UnauthorizedException({ code: "auth_required" });
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const auth = request.auth as AuthContext;

    if (!auth) {
      throw new UnauthorizedException({ code: "auth_required" });
    }

    if (
      auth.kind === "session" &&
      requiredRoles.includes(auth.session.user.role)
    ) {
      return true;
    }

    throw new ForbiddenException({ code: "access_denied" });
  }
}

@Injectable()
export class SessionOrScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: RuntimeStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredScopes = this.reflector.getAllAndOverride<ApiTokenScope[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const token = getBearerToken(authorization);

    if (!token) {
      throw new UnauthorizedException({ code: "auth_required" });
    }

    const session = await this.store.instance.getUserBySessionToken(token);
    if (session) {
      if (!requiredRoles || requiredRoles.includes(session.user.role)) {
        request.auth = { kind: "session", session };
        return true;
      }
    }

    const apiToken = await this.store.instance.getApiTokenBySecret(token);
    if (apiToken) {
      if (!requiredScopes || scopeIncludes(apiToken.scopes, requiredScopes)) {
        request.auth = { kind: "api-token", apiToken };
        return true;
      }
    }

    throw new ForbiddenException({ code: "access_denied" });
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly store: RuntimeStoreService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const token = getBearerToken(authorization);

    if (!token) {
      throw new UnauthorizedException({ code: "auth_required" });
    }

    const session = await this.store.instance.getUserBySessionToken(token);
    if (session && session.user.role === "admin") {
      request.auth = { kind: "session", session };
      return true;
    }

    throw new ForbiddenException({ code: "admin_required" });
  }
}
