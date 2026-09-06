import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
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
    // Without it a caller migrating off the prohibited shared static token has
    // no least-privilege option: `catalog:write` below cannot be minted at all
    // (provision-service-token.js accepts only `internal:<service>:<role>`), and
    // `internal:catalog-microservice:service` is absent from this set, so the
    // only mintable write credential was `...:admin`. That made the compliance
    // fix a privilege escalation — and admin is additionally in
    // `allProductAccessRoles` (product-relations.service.ts), so it would also
    // bypass per-actor product visibility. The legacy path granted these callers
    // catalog:write, never admin; the replacement must not grant more.
    'internal:catalog-microservice:write',
    'catalog:write',
  ];

  private static readonly legacyPathLogger = new Logger('CatalogAuthGuard.legacy');

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
    const serviceActor = this.resolveInternalServiceActor(request);
    if (serviceActor) {
      return serviceActor;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    return this.validateBearerToken(authHeader.slice(7));
  }

  private resolveInternalServiceActor(request: Request): CatalogActor | null {
    const configuredToken = process.env.CATALOG_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN;
    if (!configuredToken) {
      return null;
    }

    const providedToken = request.header('x-internal-service-token');
    if (!providedToken || !this.safeEqual(providedToken, configuredToken)) {
      return null;
    }

    // `x-service-name` is caller-supplied and NOT authenticated: every sender
    // presents the same shared secret, so this header is the only thing that
    // distinguishes them. It flows into actor.sub/source/serviceName, which are
    // persisted as bundle evidence and published on product events, so an
    // arbitrary value corrupts the audit trail as well as the identity.
    //
    // A configured value cannot be constrained to one caller here the way 6u
    // did on orders (one slot, six legitimate senders), but it can be
    // constrained to the set of KNOWN senders, which stops an arbitrary or
    // empty name from being recorded as fact. Deny, do not fall back to a
    // placeholder: silently relabelling an unknown caller 'internal-service'
    // would write a fiction into the same audit trail.
    // DEPRECATION PROBE. Every caller of this path has been migrated to an
    // Auth-issued per-pair principal, but the path itself is silent, so
    // "nobody uses it" cannot be proven from logs -- only from the absence of
    // this line. It is logged at WARN so it reaches logging-microservice and
    // the ErrorLogWatcher, and it names the caller so a straggler is
    // identifiable rather than merely counted. Delete this method once this
    // line has stayed absent across a full business cycle.
    CatalogAuthGuard.legacyPathLogger.warn(
      `legacy_internal_service_token_used source=${(request.header('x-service-name') || '<unset>').trim()} ` +
        `path=${request.method} ${request.path}`,
    );

    const source = (request.header('x-service-name') || '').trim();
    if (!source) {
      throw new UnauthorizedException(
        'x-service-name is required with x-internal-service-token',
      );
    }

    if (!this.allowedInternalServiceNames().includes(source)) {
      throw new UnauthorizedException(
        `Unknown internal service name '${source}'; add it to CATALOG_INTERNAL_SERVICE_NAMES if this caller is legitimate`,
      );
    }

    return {
      type: 'service',
      sub: source,
      roles: this.rolesForServiceName(source),
      source,
      serviceName: source,
      authMethod: 'internal-service-token',
    };
  }

  /**
   * Roles granted to a caller of the shared internal-service secret.
   *
   * Every caller used to receive `internal:catalog-microservice:admin` +
   * `catalog:write` regardless of what it does, because one shared secret
   * cannot distinguish them by credential. `x-service-name` is now validated
   * against `allowedInternalServiceNames()` before it reaches here, so it is
   * usable as a key: an unknown or empty name is rejected in the caller above
   * and never lands in this map.
   *
   * This narrows authorization, not authentication. The secret is still shared,
   * so a holder can still claim another holder's name — splitting it into
   * per-caller credentials is separate provisioning work. What this removes is
   * the case where a read-only caller could write, or delete, anything in the
   * catalog by virtue of holding a credential it needs only in order to read.
   *
   * Grants are derived from each caller's actual call sites, verified live
   * against the deployed pods. Default is read-only: a new name added to the
   * allowlist gets no write access until it is listed here deliberately.
   */
  private rolesForServiceName(source: string): string[] {
    const READ = ['catalog:read'];
    const WRITE = ['catalog:read', 'catalog:write'];

    const grants: Record<string, string[]> = {
      // Publishes products, media and pricing to the marketplace lanes.
      'allegro-service': WRITE,
      // POST /api/products, POST /api/media/upload, PUT /api/products/:id.
      'bazos-service': WRITE,
      // POST /api/products, PUT /api/products/:id, and provisions catalog
      // access for its own users -- which is an admin surface, not a write.
      'heureka-service': [...WRITE, 'internal:catalog-microservice:admin'],
      // POST /api/pricing only (pricing.service.ts).
      'orders-microservice': WRITE,
      // The four flipflop containers each send their own SERVICE_NAME. They
      // POST /api/products and PUT /api/products/:id through the storefront.
      'flipflop-api-gateway': WRITE,
      'flipflop-cart-service': WRITE,
      'flipflop-order-service': WRITE,
      'flipflop-product-service': WRITE,
      // Writes only the order-affinity relations under /api/internal/*, which
      // require PRODUCT_RELATION_ADMIN_ROLES rather than catalog:write.
      'marketing-microservice': [...READ, 'internal:catalog-microservice:admin'],
      // Reads products to build clips. No write call site exists.
      cliplot: READ,
      // Catalog calling its own flipflop-projection batch route.
      'catalog-microservice': WRITE,
    };

    return grants[source] ?? READ;
  }

  /**
   * Known senders of the shared internal-service secret.
   *
   * Derived from which workloads actually HOLD the credential (a fingerprint
   * scan of every Secret in `statex-apps`), then confirmed against the exact
   * string each one sends. Enumerating by call site instead would have included
   * `warehouse-microservice`, which sends `x-service-name` on a call to *orders*
   * and holds no catalog credential at all — allowlisting it would have widened
   * the grant while appearing to narrow it.
   *
   * flipflop deliberately contributes four names: all four of its containers
   * mount `flipflop-service-secret` and each derives its own `SERVICE_NAME`.
   * cliplot sends `cliplot`, not `cliplot-service`.
   *
   * Overridable via `CATALOG_INTERNAL_SERVICE_NAMES` because several callers
   * take their name from an env var (`CATALOG_CALLER_SERVICE_NAME`,
   * `SERVICE_NAME`), so a deployment can rename one without a catalog release.
   */
  private allowedInternalServiceNames(): string[] {
    const configured = (process.env.CATALOG_INTERNAL_SERVICE_NAMES || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    return configured.length
      ? configured
      : [
          'allegro-service',
          'bazos-service',
          // catalog calls its own flipflop-projection batch route with this
          // credential (products.service.ts, getFlipFlopCatalogProjection).
          'catalog-microservice',
          'cliplot',
          'flipflop-api-gateway',
          'flipflop-cart-service',
          'flipflop-order-service',
          'flipflop-product-service',
          'heureka-service',
          'marketing-microservice',
          'orders-microservice',
        ];
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

  private safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) {
      return false;
    }
    return timingSafeEqual(left, right);
  }
}
