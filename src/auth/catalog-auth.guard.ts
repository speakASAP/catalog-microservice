import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CATALOG_ROLES_KEY } from './catalog-auth.decorator';

type AuthValidateUser = {
  id?: string;
  sub?: string;
  email?: string;
  roles?: string[];
  source?: string;
  perApplicationPreferences?: Record<string, unknown>;
  [key: string]: unknown;
};

type AuthValidateResponse = {
  valid?: boolean;
  user?: AuthValidateUser;
};

export type CatalogActor = {
  type: 'jwt' | 'service';
  sub: string;
  email?: string;
  roles: string[];
  source?: string;
  serviceName?: string;
  authMethod?: 'auth-validate' | 'internal-service-token';
  isMarathonOnlyAuthUser?: boolean;
};

export type CatalogAuthenticatedRequest = Request & {
  catalogActor?: CatalogActor;
  serviceActor?: CatalogActor;
};

@Injectable()
export class CatalogAuthGuard implements CanActivate {
  private readonly authServiceUrl = (
    process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370'
  ).replace(/\/+$/, '');
  private readonly authValidateTimeoutMs = Number(
    process.env.AUTH_VALIDATE_TIMEOUT_MS || 3000,
  );
  /**
   * Roles a route must name explicitly to be reachable by a write-capable actor.
   *
   * This is NOT a fallback. Every guarded route carries `@RequireCatalogRoles`;
   * a route that forgets one fails closed (see `canActivate`) rather than
   * silently inheriting this set. It used to be the implicit default, which
   * meant 24 routes required admin without saying so — and made the grant
   * impossible to narrow, because removing a role from a caller 403'd it on
   * routes whose requirement nobody had ever written down.
   */
  static readonly WRITE_ROLES = [
    'global:superadmin',
    'global:platform_admin',
    'app:catalog-microservice:admin',
    'internal:catalog-microservice:admin',
    // The least-privilege write role for per-pair service principals, seeded by
    // auth-microservice/scripts/seed-catalog-write-role.js.
    //
    // The legacy `catalog:write` string that used to sit below it is gone with
    // the shared-secret path: it was synthesised by rolesForServiceName() from
    // an unauthenticated x-service-name header and could never be minted
    // (provision-service-token.js accepts only `internal:<service>:<role>`), so
    // with that path deleted nothing can present it. Admin is deliberately not
    // the substitute -- it is also in allProductAccessRoles
    // (product-relations.service.ts) and would bypass per-actor product
    // visibility.
    'internal:catalog-microservice:write',
  ];

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CatalogAuthenticatedRequest>();
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(CATALOG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Fail closed. A guarded route with no @RequireCatalogRoles used to inherit
    // the write/admin set, so forgetting the decorator granted admin silently
    // and looked identical to a deliberate choice. Deny instead, and name the
    // handler so the gap is fixed rather than worked around.
    if (!requiredRoles || requiredRoles.length === 0) {
      const handlerName = `${context.getClass().name}.${context.getHandler().name}`;
      this.denyUndecorated(handlerName);
    }

    const actor = await this.resolveActor(request);
    // `catalog:authenticated` means "any authenticated non-marathon actor",
    // deliberately not a role an actor has to carry. Per-pair service
    // principals arrive with roles this service never mints (aukro presents
    // `internal:catalog-microservice:service`), so matching them by name would
    // 403 callers that are legitimately authenticated. Read routes therefore
    // use this rather than enumerating every acceptable role.
    const allowsGenericAuthenticated = requiredRoles.includes('catalog:authenticated');
    const hasRequiredRole =
      (allowsGenericAuthenticated && !actor.isMarathonOnlyAuthUser) ||
      requiredRoles.some((role) => actor.roles.includes(role));
    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient catalog permissions');
    }

    request.catalogActor = actor;
    if (actor.type === 'service') {
      request.serviceActor = actor;
    }
    return true;
  }

  /**
   * A guarded route with no declared roles is a coding defect, not a request
   * problem. Log at error level with the handler name so it is actionable, then
   * deny — never authenticate the caller to find out whether it would have
   * passed, and never fall through to a permissive default.
   */
  private denyUndecorated(handlerName: string): never {
    // eslint-disable-next-line no-console
    console.error(
      `[CatalogAuthGuard] ${handlerName} is guarded but declares no @RequireCatalogRoles; ` +
        'denying the request. Add an explicit role requirement to this handler.',
    );
    throw new ForbiddenException('Route has no declared catalog role requirement');
  }

  private async resolveActor(request: Request): Promise<CatalogActor> {
    // Bearer only. The shared static x-internal-service-token path that used to
    // run first is deleted -- see the class header. A caller still presenting
    // that header now falls through to here and is rejected for having no
    // Authorization header, which is the intended loud failure.
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    return this.validateBearerToken(authHeader.slice(7));
  }

  private async validateBearerToken(token: string): Promise<CatalogActor> {
    if (!token) {
      throw new UnauthorizedException('Invalid token');
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number.isFinite(this.authValidateTimeoutMs) && this.authValidateTimeoutMs > 0
        ? this.authValidateTimeoutMs
        : 3000,
    );

    let response: Response;
    try {
      response = await fetch(`${this.authServiceUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
        signal: controller.signal,
      });
    } catch {
      throw new UnauthorizedException('Token validation failed');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new UnauthorizedException('Token validation failed');
    }

    let validation: AuthValidateResponse;
    try {
      validation = (await response.json()) as AuthValidateResponse;
    } catch {
      throw new UnauthorizedException('Token validation failed');
    }

    const user = validation.user;
    if (!validation.valid || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    const sub = user.id || user.sub || user.email;
    if (!sub) {
      throw new UnauthorizedException('Invalid token subject');
    }

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const email = String(user.email || '').toLowerCase();
    const isServiceIdentity =
      (email.startsWith('svc-') && email.endsWith('@internal.alfares.cz'))
      || roles.some((role) => role.startsWith('internal:catalog-microservice:'));

    return {
      type: isServiceIdentity ? 'service' : 'jwt',
      sub,
      email: user.email,
      roles,
      source: typeof user.source === 'string' ? user.source : undefined,
      serviceName: isServiceIdentity ? String(sub) : undefined,
      authMethod: 'auth-validate',
      isMarathonOnlyAuthUser: isServiceIdentity ? false : this.isMarathonOnlyAuthUser(user, roles),
    };
  }

  private isMarathonOnlyAuthUser(user: AuthValidateUser, roles: string[]): boolean {
    const source = typeof user.source === 'string' ? user.source.toLowerCase() : '';
    const hasMarathonMarker =
      roles.includes('app:marathon:user') ||
      source.includes('marathon') ||
      this.hasMarathonPreferences(user.perApplicationPreferences);

    if (!hasMarathonMarker) {
      return false;
    }

    return roles.every((role) => role.startsWith('app:marathon:') || role.startsWith('marathon:'));
  }

  private hasMarathonPreferences(preferences: AuthValidateUser['perApplicationPreferences']): boolean {
    return this.containsMarathonMarker(preferences);
  }

  private containsMarathonMarker(value: unknown, depth = 0): boolean {
    if (value == null || depth > 4) {
      return false;
    }
    if (typeof value === 'string') {
      return value.toLowerCase().includes('marathon');
    }
    if (Array.isArray(value)) {
      return value.some((entry) => this.containsMarathonMarker(entry, depth + 1));
    }
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).some(([key, entry]) => (
        key.toLowerCase().includes('marathon') || this.containsMarathonMarker(entry, depth + 1)
      ));
    }
    return false;
  }

}
