import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CatalogAuthGuard, CatalogAuthenticatedRequest } from './catalog-auth.guard';

describe('CatalogAuthGuard', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CATALOG_INTERNAL_SERVICE_TOKEN;
    delete process.env.INTERNAL_SERVICE_TOKEN;
    delete process.env.AUTH_SERVICE_URL;
    delete process.env.AUTH_VALIDATE_TIMEOUT_MS;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  function buildContext(request: Partial<CatalogAuthenticatedRequest>) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  function buildRequest(headers: Record<string, string | undefined>): CatalogAuthenticatedRequest {
    const normalized = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );
    return {
      headers: normalized,
      header: (name: string) => normalized[name.toLowerCase()],
    } as CatalogAuthenticatedRequest;
  }

  it('validates bearer tokens through Auth and attaches a jwt actor with preserved roles', async () => {
    process.env.AUTH_SERVICE_URL = 'http://auth-service.test/';
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:write']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({ authorization: 'Bearer opaque-token' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        valid: true,
        user: {
          id: 'user-1',
          sub: 'subject-1',
          email: 'user@example.test',
          roles: ['catalog:write', 'custom:role'],
        },
      }),
    } as any);

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);

    expect(global.fetch).toHaveBeenCalledWith('http://auth-service.test/auth/validate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'opaque-token' }),
    }));
    expect(request.catalogActor).toEqual({
      type: 'jwt',
      sub: 'user-1',
      email: 'user@example.test',
      roles: ['catalog:write', 'custom:role'],
      source: undefined,
      authMethod: 'auth-validate',
      isMarathonOnlyAuthUser: false,
    });
    expect(request.serviceActor).toBeUndefined();
  });

  it('fails closed when Auth validation rejects the bearer token', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:write']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({ authorization: 'Bearer rejected-token' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ valid: false }),
    } as any);

    await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.catalogActor).toBeUndefined();
  });

  it('preserves required role checks for Auth-validated users', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['global:superadmin']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({ authorization: 'Bearer role-token' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        valid: true,
        user: { sub: 'subject-1', roles: ['catalog:write'] },
      }),
    } as any);

    await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.catalogActor).toBeUndefined();
  });

  it('allows any Auth-validated user for authenticated-only routes', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:authenticated']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({ authorization: 'Bearer user-token' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        valid: true,
        user: { sub: 'registered-user-1', roles: [] },
      }),
    } as any);

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);

    expect(request.catalogActor).toEqual({
      type: 'jwt',
      sub: 'registered-user-1',
      email: undefined,
      roles: [],
      source: undefined,
      authMethod: 'auth-validate',
      isMarathonOnlyAuthUser: false,
    });
  });

  it('denies marathon-only imported Auth users for generic authenticated routes', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:authenticated']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({ authorization: 'Bearer marathon-only-token' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        valid: true,
        user: {
          sub: 'marathon-import-user-1',
          source: 'marathon-import',
          roles: ['app:marathon:user'],
          perApplicationPreferences: { marathon: { imported: true } },
        },
      }),
    } as any);

    await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.catalogActor).toBeUndefined();
  });

  it('denies marathon-admin-only Auth users for generic authenticated routes', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:authenticated']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({ authorization: 'Bearer marathon-admin-only-token' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        valid: true,
        user: {
          sub: 'marathon-admin-only-1',
          source: 'marathon',
          roles: ['app:marathon:admin'],
          perApplicationPreferences: { authSources: { marathon: { source: 'marathon' } } },
        },
      }),
    } as any);

    await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.catalogActor).toBeUndefined();
  });

  it('denies nested authSources marathon-only Auth users for generic authenticated routes', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:authenticated']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({ authorization: 'Bearer nested-marathon-only-token' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        valid: true,
        user: {
          sub: 'nested-marathon-only-1',
          roles: [],
          perApplicationPreferences: { authSources: { marathon: { source: 'marathon' } } },
        },
      }),
    } as any);

    await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.catalogActor).toBeUndefined();
  });

  it('allows marathon-marked Auth users with explicit catalog or global roles', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['global:platform_admin']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({ authorization: 'Bearer explicit-role-token' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        valid: true,
        user: {
          sub: 'catalog-admin-1',
          source: 'marathon-import',
          roles: ['app:marathon:user', 'global:platform_admin'],
          perApplicationPreferences: { marathon: { imported: true } },
        },
      }),
    } as any);

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);

    expect(request.catalogActor).toEqual({
      type: 'jwt',
      sub: 'catalog-admin-1',
      email: undefined,
      roles: ['app:marathon:user', 'global:platform_admin'],
      source: 'marathon-import',
      authMethod: 'auth-validate',
      isMarathonOnlyAuthUser: false,
    });
  });

  it('preserves the internal service token boundary without calling Auth validation', async () => {
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = 'machine-token';
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:write']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({
      'x-internal-service-token': 'machine-token',
      'x-service-name': 'bazos-service',
    });
    global.fetch = jest.fn();

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(request.catalogActor).toEqual({
      type: 'service',
      sub: 'bazos-service',
      roles: ['internal:catalog-microservice:admin', 'catalog:write'],
      source: 'bazos-service',
      serviceName: 'bazos-service',
      authMethod: 'internal-service-token',
    });
    expect(request.serviceActor).toEqual(request.catalogActor);
  });

  it('rejects an unknown x-service-name even with the correct shared secret', async () => {
    // The shared secret is held by eight workloads, so the header is the only
    // thing distinguishing them -- and it is caller-supplied. Before this guard
    // check, any holder could authenticate as any name, including one that does
    // not exist, and that name was persisted as bundle evidence and published
    // on product events.
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = 'machine-token';
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:write']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({
      'x-internal-service-token': 'machine-token',
      'x-service-name': 'totally-made-up-service',
    });
    global.fetch = jest.fn();

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(request.catalogActor).toBeUndefined();
  });

  it('rejects an empty x-service-name instead of authenticating it as a placeholder', async () => {
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = 'machine-token';
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:write']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({
      'x-internal-service-token': 'machine-token',
      'x-service-name': '',
    });
    global.fetch = jest.fn();

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
    expect(request.catalogActor).toBeUndefined();
  });

  it('accepts every real sender of the shared internal-service secret', async () => {
    // Derived from which workloads hold the credential, then confirmed against
    // the exact string each sends. flipflop contributes four names; cliplot
    // sends 'cliplot', not 'cliplot-service'.
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = 'machine-token';
    const senders = [
      'allegro-service',
      'bazos-service',
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

    for (const sender of senders) {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:write']) } as unknown as Reflector;
      const guard = new CatalogAuthGuard(reflector);
      const request = buildRequest({
        'x-internal-service-token': 'machine-token',
        'x-service-name': sender,
      });
      global.fetch = jest.fn();

      await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
      expect(request.catalogActor?.serviceName).toBe(sender);
    }
  });

  it('honours CATALOG_INTERNAL_SERVICE_NAMES when a caller is renamed', async () => {
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = 'machine-token';
    process.env.CATALOG_INTERNAL_SERVICE_NAMES = 'renamed-caller';
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['catalog:write']) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({
      'x-internal-service-token': 'machine-token',
      'x-service-name': 'renamed-caller',
    });
    global.fetch = jest.fn();

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.catalogActor?.serviceName).toBe('renamed-caller');
  });
});
