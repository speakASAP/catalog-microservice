import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import type { CatalogActor } from '../auth/catalog-auth.guard';
import { ProductsService } from '../products/products.service';
import { ProductRelation, ProductRelationEvidence } from './product-relation.entity';

type ProductRelationAccessScope = {
  actor?: CatalogActor;
};

type ProductRelationFindOptions = {
  relationType?: string;
  scope?: ProductRelationAccessScope;
};

export type ProductRelationWriteInput = {
  relationType?: unknown;
  score?: unknown;
  confidence?: unknown;
  source?: unknown;
  evidence?: unknown;
};

export type ProductRelationResponse = {
  id: string;
  sourceProductId: string;
  targetProductId: string;
  relationType: string;
  score: number;
  confidence: number;
  source: string;
  evidence: ProductRelationEvidence;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductRelationsService {
  private readonly relationTypePattern = /^[a-z][a-z0-9_-]{0,59}$/;
  private readonly sourcePattern = /^[a-z][a-z0-9_-]{0,79}$/;
  private readonly allProductAccessRoles = [
    'global:superadmin',
    'global:platform_admin',
    'app:catalog-microservice:admin',
    'internal:catalog-microservice:admin',
  ];

  constructor(
    @InjectRepository(ProductRelation)
    private readonly relationRepository: Repository<ProductRelation>,
    private readonly productsService: ProductsService,
  ) {}

  async findRelated(
    sourceProductId: string,
    options: ProductRelationFindOptions = {},
  ): Promise<ProductRelationResponse[]> {
    const scope = options.scope ?? {};
    await this.productsService.findOne(sourceProductId, scope as any);

    const relationType = this.normalizeOptionalRelationType(options.relationType);
    const where: FindOptionsWhere<ProductRelation> = { sourceProductId };
    if (relationType) {
      where.relationType = relationType;
    }

    const relations = await this.relationRepository.find({
      where,
      order: { score: 'DESC', confidence: 'DESC', targetProductId: 'ASC' },
    });
    const visibleRelations = await this.filterVisibleTargets(relations, scope);
    return visibleRelations
      .sort((left, right) => this.compareRelations(left, right))
      .map((relation) => this.toResponse(relation));
  }

  async upsertRelation(
    sourceProductId: string,
    targetProductId: string,
    data: ProductRelationWriteInput,
    scope: ProductRelationAccessScope = {},
  ): Promise<ProductRelationResponse> {
    const normalized = this.normalizeRelationInput(sourceProductId, targetProductId, data);

    await this.productsService.findOne(sourceProductId, scope as any);
    await this.productsService.findOne(targetProductId, scope as any);

    const existing = await this.relationRepository.findOne({
      where: {
        sourceProductId,
        targetProductId,
        relationType: normalized.relationType,
        source: normalized.source,
      },
    });

    const relation = existing ?? this.relationRepository.create({
      sourceProductId,
      targetProductId,
      relationType: normalized.relationType,
      source: normalized.source,
    });

    relation.score = normalized.score;
    relation.confidence = normalized.confidence;
    relation.evidence = normalized.evidence;

    return this.toResponse(await this.relationRepository.save(relation));
  }

  private normalizeRelationInput(
    sourceProductId: string,
    targetProductId: string,
    data: ProductRelationWriteInput,
  ) {
    if (sourceProductId === targetProductId) {
      throw new BadRequestException('Product relation cannot target the same product');
    }
    if (!data || Array.isArray(data) || typeof data !== 'object') {
      throw new BadRequestException('Product relation payload must be an object');
    }

    const relationType = this.normalizeToken(
      data.relationType,
      'relationType',
      this.relationTypePattern,
      'relationType must be a lowercase relation type token',
    );
    const score = this.validateFiniteNonNegative(data.score, 'score');
    const confidence =
      data.confidence === undefined || data.confidence === null
        ? 1
        : this.validateFiniteNonNegative(data.confidence, 'confidence');
    if (confidence > 1) {
      throw new BadRequestException('confidence must be between zero and one');
    }

    const source =
      data.source === undefined || data.source === null || data.source === ''
        ? 'manual'
        : this.normalizeToken(
            data.source,
            'source',
            this.sourcePattern,
            'source must be a lowercase source token',
          );

    return {
      relationType,
      score,
      confidence,
      source,
      evidence: this.validateEvidence(data.evidence),
    };
  }

  private normalizeOptionalRelationType(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return this.normalizeToken(
      value,
      'relationType',
      this.relationTypePattern,
      'relationType must be a lowercase relation type token',
    );
  }

  private normalizeToken(
    value: unknown,
    field: string,
    pattern: RegExp,
    message: string,
  ): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} is required`);
    }
    const normalized = value.trim();
    if (!pattern.test(normalized)) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private validateFiniteNonNegative(value: unknown, field: string): number {
    const score = Number(value);
    if (!Number.isFinite(score)) {
      throw new BadRequestException(`${field} must be a finite number`);
    }
    if (score < 0) {
      throw new BadRequestException(`${field} must not be negative`);
    }
    return score;
  }

  private validateEvidence(value: unknown): ProductRelationEvidence {
    if (value === undefined || value === null) {
      return {};
    }
    if (Array.isArray(value) || typeof value !== 'object') {
      throw new BadRequestException('evidence must be a JSON object');
    }
    return value as ProductRelationEvidence;
  }

  private async filterVisibleTargets(
    relations: ProductRelation[],
    scope: ProductRelationAccessScope,
  ): Promise<ProductRelation[]> {
    if (this.canAccessAllProducts(scope.actor)) {
      return relations;
    }

    const checks = await Promise.all(relations.map(async (relation) => {
      try {
        await this.productsService.findOne(relation.targetProductId, scope as any);
        return relation;
      } catch (error) {
        if (error instanceof NotFoundException) {
          return null;
        }
        throw error;
      }
    }));

    return checks.filter((relation): relation is ProductRelation => relation !== null);
  }

  private canAccessAllProducts(actor?: CatalogActor): boolean {
    if (!actor || actor.type === 'service') {
      return true;
    }
    return actor.roles.some((role) => this.allProductAccessRoles.includes(role));
  }

  private compareRelations(left: ProductRelation, right: ProductRelation): number {
    const score = this.numberValue(right.score) - this.numberValue(left.score);
    if (score !== 0) {
      return score;
    }
    const confidence = this.numberValue(right.confidence) - this.numberValue(left.confidence);
    if (confidence !== 0) {
      return confidence;
    }
    return left.targetProductId.localeCompare(right.targetProductId);
  }

  private toResponse(relation: ProductRelation): ProductRelationResponse {
    return {
      id: relation.id,
      sourceProductId: relation.sourceProductId,
      targetProductId: relation.targetProductId,
      relationType: relation.relationType,
      score: this.numberValue(relation.score),
      confidence: this.numberValue(relation.confidence),
      source: relation.source,
      evidence: relation.evidence ?? {},
      createdAt: relation.createdAt,
      updatedAt: relation.updatedAt,
    };
  }

  private numberValue(value: unknown): number {
    return Number(value);
  }
}
