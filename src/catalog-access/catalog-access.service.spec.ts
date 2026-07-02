import { ForbiddenException } from '@nestjs/common';
import { CatalogAccessService } from './catalog-access.service';

describe('CatalogAccessService', () => {
  const actor = { type: 'jwt' as const, sub: 'seller-1', roles: [], authMethod: 'auth-validate' as const };

  it('provisions seller settings with Alfares enabled and community disabled by default', async () => {
    const repository: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const service = new CatalogAccessService(repository);

    const settings = await service.ensureSettings(actor, 'catalog');

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'seller-1',
      includeAlfaresCatalog: true,
      includeCommunityCatalog: false,
      sourceApplication: 'catalog',
    }));
    expect(settings).toMatchObject({
      userId: 'seller-1',
      includeAlfaresCatalog: true,
      includeCommunityCatalog: false,
      sourceApplication: 'catalog',
      created: true,
    });
  });

  it('updates only source-selection settings for the authenticated seller', async () => {
    const row = {
      userId: 'seller-1',
      includeAlfaresCatalog: true,
      includeCommunityCatalog: false,
      sourceApplication: null,
    };
    const repository: any = {
      findOne: jest.fn(async () => row),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const service = new CatalogAccessService(repository);

    const settings = await service.updateSettings(actor, { includeCommunityCatalog: true });

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'seller-1',
      includeAlfaresCatalog: true,
      includeCommunityCatalog: true,
    }));
    expect(settings.includeCommunityCatalog).toBe(true);
  });

  it('rejects service actors for human source settings', async () => {
    const repository: any = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new CatalogAccessService(repository);

    await expect(service.ensureSettings({
      type: 'service',
      sub: 'catalog-worker',
      roles: ['catalog:write'],
      authMethod: 'internal-service-token',
    })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
