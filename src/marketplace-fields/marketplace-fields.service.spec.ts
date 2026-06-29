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
});
