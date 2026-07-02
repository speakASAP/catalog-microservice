import { MarketplaceFieldsService } from './marketplace-fields.service';

const buildRepository = (product: any = null, profile: any = null) => {
  const saved: any[] = [];
  return {
    productRepository: {
      findOne: jest.fn(async () => product),
      save: jest.fn(async (next) => {
        saved.push(next);
        return next;
      }),
    },
    profileRepository: {
      findOne: jest.fn(async () => profile),
      create: jest.fn((next) => next),
      save: jest.fn(async (next) => {
        saved.push(next);
        return { ...next, id: next.id || 'profile-1', updatedAt: new Date('2026-06-29T00:00:00Z') };
      }),
    },
    saved,
  };
};

describe('MarketplaceFieldsService', () => {
  const logger = { log: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns canonical aliases without duplicating product truth into overrides', async () => {
    const product = {
      id: 'product-1',
      sku: 'SKU-1',
      title: 'Catalog title',
      description: 'Catalog description',
      brand: 'Brand',
      manufacturer: 'Maker',
      ean: '123',
      lifecycle: 'active',
      isActive: true,
      categories: [],
      media: [],
      pricing: [],
    };
    const { productRepository, profileRepository } = buildRepository(product);
    const service = new MarketplaceFieldsService(productRepository as any, profileRepository as any, logger);

    const response = await service.getProductMarketplaceFields('product-1', 'allegro');
    const title = response.fields.find((field: any) => field.key === 'title');
    const category = response.fields.find((field: any) => field.key === 'categoryId');

    expect(title).toMatchObject({
      source: 'canonical',
      canonicalPath: 'title',
      value: 'Catalog title',
    });
    expect(category).toMatchObject({
      source: 'override',
      value: null,
    });
    expect(response.profile.overrides).toEqual({});
  });

  it('updates canonical fields on Product and marketplace-only fields on profile', async () => {
    const product = {
      id: 'product-1',
      sku: 'SKU-1',
      title: 'Old title',
      description: 'Old description',
      brand: null,
      manufacturer: null,
      ean: null,
      lifecycle: 'active',
      isActive: true,
      categories: [],
      media: [],
      pricing: [],
    };
    const { productRepository, profileRepository } = buildRepository(product);
    const service = new MarketplaceFieldsService(productRepository as any, profileRepository as any, logger);

    const response = await service.updateProductMarketplaceFields('product-1', 'allegro', {
      canonical: {
        title: 'New title',
        sku: 'SHOULD-NOT-CHANGE',
      },
      overrides: {
        categoryId: '12345',
      },
      externalRefs: {
        listingUrl: 'https://allegro.cz/oferta/123',
      },
    });

    expect(productRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New title',
      sku: 'SKU-1',
    }));
    expect(profileRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      marketplace: 'allegro',
      overrides: expect.objectContaining({ categoryId: '12345' }),
      externalRefs: expect.objectContaining({ listingUrl: 'https://allegro.cz/oferta/123' }),
    }));
    expect(response.fields.find((field: any) => field.key === 'categoryId')?.value).toBe('12345');
  });

  it('marks saved marketplace overrides as manual and current to the product source', async () => {
    const product = {
      id: 'product-1',
      sku: 'SKU-1',
      title: 'Catalog title',
      description: 'Catalog description',
      brand: null,
      manufacturer: null,
      ean: null,
      lifecycle: 'active',
      isActive: true,
      categories: [],
      media: [],
      pricing: [],
      updatedAt: new Date('2026-07-02T10:00:00Z'),
    };
    const { productRepository, profileRepository } = buildRepository(product);
    const service = new MarketplaceFieldsService(productRepository as any, profileRepository as any, logger);

    const response = await service.updateProductMarketplaceFields('product-1', 'bazos', {
      overrides: {
        title: 'Manual Bazos title',
        description: 'Manual Bazos listing text',
      },
    });

    expect(profileRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      manualOverrides: expect.objectContaining({
        title: expect.objectContaining({
          manual: true,
          field: 'title',
          productUpdatedAt: '2026-07-02T10:00:00.000Z',
        }),
        description: expect.objectContaining({
          manual: true,
          field: 'description',
          productUpdatedAt: '2026-07-02T10:00:00.000Z',
        }),
      }),
      sourceState: expect.objectContaining({
        canonicalProductUpdatedAt: '2026-07-02T10:00:00.000Z',
        staleManualFields: [],
        validationRequired: false,
      }),
    }));
    expect(response.propagation).toMatchObject({
      status: 'current',
      staleManualFields: [],
      validationRequired: false,
    });
    expect(response.fields.find((field: any) => field.key === 'description')).toMatchObject({
      manualOverride: true,
      stale: false,
    });
  });

  it('marks manual marketplace fields stale when canonical product source changed later', async () => {
    const product = {
      id: 'product-1',
      sku: 'SKU-1',
      title: 'Updated Catalog title',
      description: 'Updated Catalog description',
      brand: null,
      manufacturer: null,
      ean: null,
      lifecycle: 'active',
      isActive: true,
      categories: [],
      media: [],
      pricing: [],
      updatedAt: new Date('2026-07-02T12:00:00Z'),
    };
    const profile = {
      id: 'profile-1',
      productId: 'product-1',
      marketplace: 'bazos',
      canonicalAliases: {},
      overrides: { description: 'Manual old listing text' },
      externalRefs: {},
      sourceData: null,
      manualOverrides: {
        description: {
          manual: true,
          field: 'description',
          updatedAt: '2026-07-02T10:05:00.000Z',
          productUpdatedAt: '2026-07-02T10:00:00.000Z',
        },
      },
      status: 'draft',
      updatedAt: new Date('2026-07-02T10:05:00Z'),
    };
    const { productRepository, profileRepository } = buildRepository(product, profile);
    const service = new MarketplaceFieldsService(productRepository as any, profileRepository as any, logger);

    const response = await service.getProductMarketplaceFields('product-1', 'bazos');

    expect(response.propagation).toMatchObject({
      status: 'manual_review_required',
      staleManualFields: ['description'],
      validationRequired: true,
      catalogReadinessRequired: true,
    });
    expect(response.profile.sourceState).toMatchObject({
      canonicalProductUpdatedAt: '2026-07-02T12:00:00.000Z',
      staleManualFields: ['description'],
      validationRequired: true,
    });
    expect(response.fields.find((field: any) => field.key === 'description')).toMatchObject({
      manualOverride: true,
      stale: true,
      requiresManualReview: true,
    });
  });

});
