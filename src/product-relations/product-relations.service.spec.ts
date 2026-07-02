import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductRelation } from './product-relation.entity';
import { ProductRelationsService } from './product-relations.service';

const sourceProductId = '00000000-0000-4000-8000-000000000100';
const targetProductA = '00000000-0000-4000-8000-000000000001';
const targetProductB = '00000000-0000-4000-8000-000000000002';
const targetProductC = '00000000-0000-4000-8000-000000000003';
const hiddenTargetProduct = '00000000-0000-4000-8000-000000000099';

const jwtActor = {
  type: 'jwt' as const,
  sub: 'user-1',
  roles: ['catalog:authenticated'],
};

const adminActor = {
  type: 'jwt' as const,
  sub: 'admin-1',
  roles: ['app:catalog-microservice:admin'],
};

const relationRow = (overrides: Partial<ProductRelation>): ProductRelation => ({
  id: '00000000-0000-4000-8000-000000000900',
  sourceProduct: undefined as never,
  sourceProductId,
  targetProduct: undefined as never,
  targetProductId: targetProductA,
  relationType: 'order_affinity',
  score: 1,
  confidence: 1,
  source: 'manual',
  evidence: {},
  createdAt: new Date('2026-07-02T00:00:00.000Z'),
  updatedAt: new Date('2026-07-02T00:00:00.000Z'),
  ...overrides,
});

describe('ProductRelationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts normalized manual relation scores', async () => {
    const repository = {
      findOne: jest.fn(async () => null),
      create: jest.fn((data) => relationRow(data)),
      save: jest.fn(async (data) => ({
        ...data,
        id: '00000000-0000-4000-8000-000000000901',
        createdAt: new Date('2026-07-02T01:00:00.000Z'),
        updatedAt: new Date('2026-07-02T01:00:00.000Z'),
      })),
    };
    const productsService = {
      findOne: jest.fn(async (id: string) => ({ id })),
    };
    const service = new ProductRelationsService(repository as any, productsService as any);

    const result = await service.upsertRelation(
      sourceProductId,
      targetProductA,
      {
        relationType: 'order_affinity',
        score: '12.5',
        confidence: '0.75',
        source: 'manual',
        evidence: { orderCount: 4 },
      } as any,
      { actor: adminActor },
    );

    expect(productsService.findOne).toHaveBeenCalledWith(sourceProductId, { actor: adminActor });
    expect(productsService.findOne).toHaveBeenCalledWith(targetProductA, { actor: adminActor });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        sourceProductId,
        targetProductId: targetProductA,
        relationType: 'order_affinity',
        source: 'manual',
      },
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      score: 12.5,
      confidence: 0.75,
      evidence: { orderCount: 4 },
    }));
    expect(result).toMatchObject({
      sourceProductId,
      targetProductId: targetProductA,
      relationType: 'order_affinity',
      score: 12.5,
      confidence: 0.75,
      source: 'manual',
      evidence: { orderCount: 4 },
    });
  });

  it('rejects self-relations and invalid score values', async () => {
    const service = new ProductRelationsService({} as any, { findOne: jest.fn() } as any);

    await expect(service.upsertRelation(sourceProductId, sourceProductId, {
      relationType: 'related',
      score: 1,
    }, { actor: adminActor })).rejects.toThrow(BadRequestException);

    await expect(service.upsertRelation(sourceProductId, targetProductA, {
      relationType: 'related',
      score: -1,
    }, { actor: adminActor })).rejects.toThrow(BadRequestException);

    await expect(service.upsertRelation(sourceProductId, targetProductA, {
      relationType: 'related',
      score: Number.NaN,
    }, { actor: adminActor })).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid confidence, source tokens, and evidence shape', async () => {
    const service = new ProductRelationsService({} as any, { findOne: jest.fn() } as any);

    await expect(service.upsertRelation(sourceProductId, targetProductA, {
      relationType: 'related',
      score: 1,
      confidence: 1.1,
    }, { actor: adminActor })).rejects.toThrow(BadRequestException);

    await expect(service.upsertRelation(sourceProductId, targetProductA, {
      relationType: 'related',
      score: 1,
      source: 'Orders Import',
    }, { actor: adminActor })).rejects.toThrow(BadRequestException);

    await expect(service.upsertRelation(sourceProductId, targetProductA, {
      relationType: 'related',
      score: 1,
      evidence: ['not-object'],
    } as any, { actor: adminActor })).rejects.toThrow(BadRequestException);
  });

  it('returns visible relations in deterministic score order', async () => {
    const repository = {
      find: jest.fn(async () => [
        relationRow({ id: 'rel-c', targetProductId: targetProductC, score: '10.0000' as any, confidence: '0.4000' as any }),
        relationRow({ id: 'rel-b', targetProductId: targetProductB, score: '10.0000' as any, confidence: '0.8000' as any }),
        relationRow({ id: 'rel-a', targetProductId: targetProductA, score: '10.0000' as any, confidence: '0.8000' as any }),
        relationRow({ id: 'rel-hidden', targetProductId: hiddenTargetProduct, score: '99.0000' as any, confidence: '1.0000' as any }),
      ]),
    };
    const productsService = {
      findOne: jest.fn(async (id: string) => {
        if (id === hiddenTargetProduct) {
          throw new NotFoundException('hidden');
        }
        return { id };
      }),
    };
    const service = new ProductRelationsService(repository as any, productsService as any);

    const result = await service.findRelated(sourceProductId, {
      relationType: 'order_affinity',
      scope: { actor: jwtActor },
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: { sourceProductId, relationType: 'order_affinity' },
      order: { score: 'DESC', confidence: 'DESC', targetProductId: 'ASC' },
    });
    expect(result.map((relation) => relation.targetProductId)).toEqual([
      targetProductA,
      targetProductB,
      targetProductC,
    ]);
  });
});
