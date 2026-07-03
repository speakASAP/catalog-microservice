import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogBundle } from './catalog-bundle.entity';
import { BundlesService } from './bundles.service';

const productA = '00000000-0000-4000-8000-000000000001';
const productB = '00000000-0000-4000-8000-000000000002';
const productC = '00000000-0000-4000-8000-000000000003';

const adminActor = {
  type: 'jwt' as const,
  sub: 'admin-1',
  roles: ['app:catalog-microservice:admin'],
};

const userActor = {
  type: 'jwt' as const,
  sub: 'user-1',
  roles: ['catalog:authenticated'],
};

const createDto = {
  contractVersion: 'catalog.bundle.v1',
  idempotencyKey: 'catalog.bundle.v1:test:1',
  source: 'manual' as const,
  items: [
    { productId: productA, quantity: 1, position: 2 },
    { productId: productB, quantity: 2, position: 1 },
  ],
  presentation: {
    displayName: 'Starter set',
    pricePolicy: 'checkout_authoritative' as const,
    currencyHint: 'CZK',
  },
  visibility: { scope: 'catalog_internal' as const, channels: [] },
  evidence: { candidateId: 'safe-candidate' },
};

const bundleRow = (overrides: Partial<CatalogBundle> = {}): CatalogBundle => ({
  id: '00000000-0000-4000-8000-000000000900',
  contractVersion: 'catalog.bundle.v1',
  status: 'draft',
  source: 'manual',
  idempotencyKey: 'catalog.bundle.v1:test:1',
  idempotencyRequestHash: 'hash',
  displayName: 'Starter set',
  description: null,
  pricePolicy: 'checkout_authoritative',
  discountPolicyRef: null,
  freeShippingPolicyRef: null,
  currencyHint: 'CZK',
  visibility: { scope: 'catalog_internal', channels: [], startsAt: null, endsAt: null },
  evidence: { candidateId: 'safe-candidate' },
  validation: { state: 'valid', blockers: [] },
  createdBy: null,
  updatedBy: null,
  items: [
    { bundleId: '00000000-0000-4000-8000-000000000900', productId: productB, quantity: 2, position: 1, role: 'component' } as any,
    { bundleId: '00000000-0000-4000-8000-000000000900', productId: productA, quantity: 1, position: 2, role: 'component' } as any,
  ],
  createdAt: new Date('2026-07-03T10:00:00.000Z'),
  updatedAt: new Date('2026-07-03T10:00:00.000Z'),
  archivedAt: null,
  ...overrides,
});

const buildService = (overrides: any = {}) => {
  const repository = {
    findOne: jest.fn(async () => null),
    find: jest.fn(async () => []),
    create: jest.fn((data) => bundleRow(data)),
    save: jest.fn(async (data) => ({
      ...data,
      id: data.id ?? '00000000-0000-4000-8000-000000000900',
      createdAt: data.createdAt ?? new Date('2026-07-03T10:00:00.000Z'),
      updatedAt: new Date('2026-07-03T10:00:00.000Z'),
    })),
    ...overrides.repository,
  };
  const itemRepository = {
    create: jest.fn((data) => data),
    ...overrides.itemRepository,
  };
  const productsService = {
    findOne: jest.fn(async (id: string) => ({ id, isActive: true, lifecycle: 'active' })),
    ...overrides.productsService,
  };
  const pricingService = {
    getCurrentPrice: jest.fn(async () => ({ currency: 'CZK', basePrice: 100 })),
    ...overrides.pricingService,
  };
  const logger = { log: jest.fn(), auditCatalogWrite: jest.fn() };
  return {
    service: new BundlesService(repository as any, itemRepository as any, productsService as any, pricingService as any, logger as any),
    repository,
    itemRepository,
    productsService,
    pricingService,
  };
};

describe('BundlesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a draft catalog.bundle.v1 aggregate without checkout ownership', async () => {
    const { service, repository, productsService } = buildService();

    const result = await service.create(createDto, { actor: adminActor });

    expect(productsService.findOne).toHaveBeenCalledWith(productA, { actor: adminActor });
    expect(productsService.findOne).toHaveBeenCalledWith(productB, { actor: adminActor });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      contractVersion: 'catalog.bundle.v1',
      status: 'draft',
      source: 'manual',
      pricePolicy: 'checkout_authoritative',
    }));
    expect(result).toMatchObject({
      contractVersion: 'catalog.bundle.v1',
      status: 'draft',
      source: 'manual',
      presentation: { displayName: 'Starter set', pricePolicy: 'checkout_authoritative' },
      validation: { state: 'valid', blockers: [] },
    });
    expect(result.items.map((item) => item.productId)).toEqual([productB, productA]);
  });

  it('replays matching idempotency and rejects conflicting replay', async () => {
    const existing = bundleRow();
    const first = buildService({ repository: { findOne: jest.fn(async () => existing) } });
    existing.idempotencyRequestHash = (first.service as any).hashNormalized((first.service as any).normalizeExisting(existing));

    const replay = await first.service.create(createDto, { actor: adminActor });
    expect(replay.idempotencyReplayed).toBe(true);

    const second = buildService({ repository: { findOne: jest.fn(async () => bundleRow({ idempotencyRequestHash: 'different' })) } });
    await expect(second.service.create(createDto, { actor: adminActor })).rejects.toThrow(ConflictException);
  });

  it('rejects duplicate products, sensitive evidence, and unsupported contract versions', async () => {
    const { service } = buildService();

    await expect(service.create({ ...createDto, contractVersion: 'catalog.bundle.v2' }, { actor: adminActor })).rejects.toThrow(BadRequestException);
    await expect(service.create({ ...createDto, items: [{ productId: productA }, { productId: productA }] } as any, { actor: adminActor })).rejects.toThrow(BadRequestException);
    await expect(service.create({ ...createDto, evidence: { paymentProvider: 'raw-provider' } }, { actor: adminActor })).rejects.toThrow(BadRequestException);
  });

  it('blocks activation for storefront visibility until checkout contracts exist', async () => {
    const row = bundleRow({
      visibility: { scope: 'storefront', channels: [], startsAt: null, endsAt: null },
    });
    const { service, repository } = buildService({
      repository: { findOne: jest.fn(async () => row) },
    });

    await expect(service.activate(row.id, { actor: adminActor })).rejects.toThrow(BadRequestException);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      validation: { state: 'blocked', blockers: ['checkout_contract_missing'] },
    }));
  });

  it('activates internal bundles after product and policy evidence validation passes', async () => {
    const row = bundleRow({
      discountPolicyRef: 'policy-1',
      freeShippingPolicyRef: 'shipping-1',
    });
    const { service } = buildService({
      repository: { findOne: jest.fn(async () => row) },
    });

    const result = await service.activate(row.id, { actor: adminActor });

    expect(result.status).toBe('active');
    expect(result.validation).toEqual({ state: 'valid', blockers: [] });
  });

  it('hides non-active internal bundles from non-admin reads', async () => {
    const row = bundleRow();
    const { service } = buildService({
      repository: { findOne: jest.fn(async () => row) },
    });

    await expect(service.get(row.id, { actor: userActor })).rejects.toThrow(NotFoundException);
  });

  it('archives without deleting bundle rows', async () => {
    const row = bundleRow({ status: 'active' });
    const { service } = buildService({
      repository: { findOne: jest.fn(async () => row) },
    });

    const result = await service.archive(row.id, { actor: adminActor });

    expect(result.status).toBe('archived');
    expect(result.archivedAt).toBeTruthy();
    expect(result.validation.blockers).toEqual(['bundle_archived']);
  });
});
