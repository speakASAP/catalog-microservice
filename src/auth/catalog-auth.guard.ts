import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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
  private readonly defaultWriteRoles = [
    'global:superadmin',
    'global:platform_admin',
    'app:catalog-microservice:admin',
    'internal:catalog-microservice:admin',
    'catalog:write',
  ];

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CatalogAuthenticatedRequest>();
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(CATALOG_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? this.defaultWriteRoles;

    const actor = await this.resolveActor(request);
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

    const source = request.header('x-service-name') || 'internal-service';
    return {
      type: 'service',
      sub: source,
      roles: ['internal:catalog-microservice:admin', 'catalog:write'],
      source,
      serviceName: source,
      authMethod: 'internal-service-token',
    };
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

    return {
      type: 'jwt',
      sub,
      email: user.email,
      roles,
      source: typeof user.source === 'string' ? user.source : undefined,
      authMethod: 'auth-validate',
      isMarathonOnlyAuthUser: this.isMarathonOnlyAuthUser(user, roles),
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
