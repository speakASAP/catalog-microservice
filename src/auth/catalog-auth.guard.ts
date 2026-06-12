import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { CATALOG_ROLES_KEY } from './catalog-auth.decorator';

type JwtPayload = {
  sub?: string;
  email?: string;
  roles?: string[];
  exp?: number;
  [key: string]: unknown;
};

type CatalogActor = {
  type: 'jwt' | 'service';
  sub: string;
  email?: string;
  roles: string[];
  source?: string;
};

@Injectable()
export class CatalogAuthGuard implements CanActivate {
  private readonly defaultWriteRoles = [
    'global:superadmin',
    'global:platform_admin',
    'app:catalog-microservice:admin',
    'internal:catalog-microservice:admin',
    'catalog:write',
  ];

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { catalogActor?: CatalogActor }>();
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(CATALOG_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? this.defaultWriteRoles;

    const actor = this.resolveActor(request);
    const hasRequiredRole = requiredRoles.some((role) => actor.roles.includes(role));
    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient catalog permissions');
    }

    request.catalogActor = actor;
    return true;
  }

  private resolveActor(request: Request): CatalogActor {
    const serviceActor = this.resolveInternalServiceActor(request);
    if (serviceActor) {
      return serviceActor;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const payload = this.verifyJwt(authHeader.slice(7));
    return {
      type: 'jwt',
      sub: payload.sub || payload.email || 'unknown',
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
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
    };
  }

  private verifyJwt(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Catalog JWT verification is not configured');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const header = this.decodeJson<{ alg?: string }>(encodedHeader);
    if (header.alg !== 'HS256') {
      throw new UnauthorizedException('Unsupported token algorithm');
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (!this.safeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid token signature');
    }

    const payload = this.decodeJson<JwtPayload>(encodedPayload);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new UnauthorizedException('Token expired');
    }

    return payload;
  }

  private decodeJson<T>(encoded: string): T {
    try {
      return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException('Invalid token payload');
    }
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
