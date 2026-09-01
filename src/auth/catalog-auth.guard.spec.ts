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
    // bazos publishes products and media, so it is a writer -- but it no longer
    // receives `internal:catalog-microservice:admin` just for holding the
    // shared secret.
    expect(request.catalogActor).toEqual({
      type: 'service',
      sub: 'bazos-service',
      roles: ['catalog:read', 'catalog:write'],
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

    // Asserted against a read route: every real sender must AUTHENTICATE. What
    // each may then DO is the per-caller grant, covered separately below --
    // asserting this against a write route conflated the two and would now fail
    // for the read-only callers, which is the point of the narrowing.
    for (const sender of senders) {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['catalog:authenticated']),
      } as unknown as Reflector;
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
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['catalog:authenticated']),
    } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({
      'x-internal-service-token': 'machine-token',
      'x-service-name': 'renamed-caller',
    });
    global.fetch = jest.fn();

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.catalogActor?.serviceName).toBe('renamed-caller');
    // A name allowlisted but not named in the grant map is read-only: adding a
    // caller must not silently confer write access.
    expect(request.catalogActor?.roles).toEqual(['catalog:read']);
  });

  describe('per-caller role grants', () => {
    beforeEach(() => {
      process.env.CATALOG_INTERNAL_SERVICE_TOKEN = 'machine-token';
      global.fetch = jest.fn();
    });

    const canActivateAs = async (sender: string, requiredRoles: string[]) => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
      } as unknown as Reflector;
      const guard = new CatalogAuthGuard(reflector);
      const request = buildRequest({
        'x-internal-service-token': 'machine-token',
        'x-service-name': sender,
      });
      return guard.canActivate(buildContext(request));
    };

    it('denies a read-only caller on a write route', async () => {
      // cliplot only ever GETs /api/products. Before the per-caller map it held
      // internal:catalog-microservice:admin + catalog:write and could have
      // deleted any product in the catalog.
      await expect(canActivateAs('cliplot', ['catalog:write'])).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        canActivateAs('cliplot', CatalogAuthGuard.WRITE_ROLES),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('still allows a read-only caller to read', async () => {
      await expect(canActivateAs('cliplot', ['catalog:authenticated'])).resolves.toBe(true);
    });

    it('allows a publishing caller to write', async () => {
      await expect(canActivateAs('bazos-service', ['catalog:write'])).resolves.toBe(true);
      await expect(canActivateAs('allegro-service', ['catalog:write'])).resolves.toBe(true);
      await expect(canActivateAs('orders-microservice', ['catalog:write'])).resolves.toBe(true);
    });

    it('grants catalog admin only to the callers that provision or write relations', async () => {
      const adminRoute = ['internal:catalog-microservice:admin'];
      await expect(canActivateAs('heureka-service', adminRoute)).resolves.toBe(true);
      await expect(canActivateAs('marketing-microservice', adminRoute)).resolves.toBe(true);

      for (const reader of ['cliplot', 'bazos-service', 'allegro-service']) {
        await expect(canActivateAs(reader, adminRoute)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
      }
    });

    it('does not grant marketing catalog:write for its admin relation routes', async () => {
      await expect(canActivateAs('marketing-microservice', ['catalog:write'])).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  it('denies a guarded route that declares no roles instead of inheriting write access', async () => {
    // The old fallback made an undecorated route require the write/admin set,
    // so forgetting the decorator granted admin and looked deliberate. Fail closed.
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = 'machine-token';
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new CatalogAuthGuard(reflector);
    const request = buildRequest({
      'x-internal-service-token': 'machine-token',
      'x-service-name': 'allegro-service',
    });
    global.fetch = jest.fn();

    await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.catalogActor).toBeUndefined();
  });
});
