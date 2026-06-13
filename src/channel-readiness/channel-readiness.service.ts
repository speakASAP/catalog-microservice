import { Injectable } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import { ProductPricing } from '../pricing/product-pricing.entity';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/product.entity';
import type {
  ChannelReadiness,
  ChannelReadinessIssue,
  ChannelReadinessResponse,
  ChannelReadinessStatus,
} from './channel-readiness.types';

type ProductReadinessFacts = {
  lifecycle: string;
  isActive: boolean;
  hasTitle: boolean;
  hasDescription: boolean;
  hasCategory: boolean;
  hasMedia: boolean;
  hasPlaceholderMedia: boolean;
  hasCurrentPrice: boolean;
  duplicateSku: boolean;
  duplicateEan: boolean;
  currentPrice: ProductPricing | null;
};

type ChannelRule = {
  channel: string;
  authority: string;
  build: (product: Product, facts: ProductReadinessFacts) => ChannelReadiness;
};

@Injectable()
export class ChannelReadinessService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly pricingService: PricingService,
  ) {}

  async getProductReadiness(productId: string): Promise<ChannelReadinessResponse> {
    const product = await this.productsService.findOne(productId);
    const productReadiness = await this.productsService.getReadiness(productId);
    const currentPrice = await this.pricingService.getCurrentPrice(productId);
    const facts = this.buildFacts(product, productReadiness, currentPrice);
    const channels = this.channelRules().map((rule) => rule.build(product, facts));

    return {
      productId: product.id,
      sku: product.sku,
      ready: channels.every((channel) => channel.ready),
      channels,
    };
  }

  private channelRules(): ChannelRule[] {
    return [
      {
        channel: 'flipflop',
        authority: 'flipflop',
        build: (_product, facts) => this.buildFlipFlopReadiness(facts),
      },
      {
        channel: 'bazos_draft',
        authority: 'bazos',
        build: (_product, facts) => this.buildBazosDraftReadiness(facts),
      },
    ];
  }

  private buildFacts(
    product: Product,
    productReadiness: { lifecycle?: string; checks?: { duplicateSku?: boolean; duplicateEan?: boolean } },
    currentPrice: ProductPricing | null,
  ): ProductReadinessFacts {
    return {
      lifecycle: productReadiness.lifecycle || product.lifecycle || (product.isActive ? 'active' : 'archived'),
      isActive: product.isActive !== false,
      hasTitle: Boolean(product.title?.trim()),
      hasDescription: Boolean(product.description?.trim()),
      hasCategory: Boolean(product.categories?.length),
      hasMedia: Boolean(product.media?.length),
      hasPlaceholderMedia: Boolean(product.media?.some((media) => this.isPlaceholderMedia(media))),
      hasCurrentPrice: Boolean(currentPrice),
      duplicateSku: Boolean(productReadiness.checks?.duplicateSku),
      duplicateEan: Boolean(productReadiness.checks?.duplicateEan),
      currentPrice,
    };
  }

  private buildFlipFlopReadiness(facts: ProductReadinessFacts): ChannelReadiness {
    const issues = [
      ...this.catalogBlockingIssues(facts),
      ...this.requireField(facts.hasTitle, 'title', 'missing_title', 'Product title is required for FlipFlop projection.', 'Add a catalog product title.'),
      ...this.requireField(facts.hasDescription, 'description', 'missing_description', 'Product description is required for FlipFlop projection.', 'Add a product description suitable for the storefront.'),
      ...this.requireField(facts.hasCategory, 'categories', 'missing_category', 'A product category is required for FlipFlop navigation.', 'Assign at least one active catalog category.'),
      ...this.requireField(facts.hasMedia, 'media', 'missing_media', 'Product media is required before FlipFlop can present the item.', 'Add at least one external media reference.'),
      ...this.requireField(facts.hasCurrentPrice, 'pricing', 'missing_current_price', 'A deterministic current price is required for FlipFlop.', 'Add an active valid catalog price.'),
    ];

    if (facts.hasPlaceholderMedia) {
      issues.push({
        code: 'placeholder_media',
        field: 'media',
        severity: 'warning',
        message: 'Product media appears to use a placeholder reference.',
        nextAction: 'Replace placeholder media with a real external media reference.',
      });
    }

    return this.toChannelReadiness({
      channel: 'flipflop',
      authority: 'flipflop',
      issues,
      readyAction: 'Product truth is ready for FlipFlop projection. FlipFlop still owns storefront and checkout behavior.',
      blockedAction: 'Fix the catalog fields listed before FlipFlop consumes this product.',
    });
  }

  private buildBazosDraftReadiness(facts: ProductReadinessFacts): ChannelReadiness {
    const issues = [
      ...this.catalogBlockingIssues(facts),
      ...this.requireField(facts.hasTitle, 'title', 'missing_title', 'Product title is required for a Bazos draft request.', 'Add a catalog product title.'),
      ...this.requireField(facts.hasDescription, 'description', 'missing_description', 'Product description is required for a Bazos draft request.', 'Add a product description for draft creation.'),
      ...this.requireField(facts.hasCategory, 'categories', 'missing_category', 'A category is required before requesting a Bazos draft.', 'Map the product to a catalog category before draft creation.'),
      ...this.requireField(facts.hasMedia, 'media', 'missing_media', 'Product media is required before requesting a Bazos draft.', 'Add at least one external media reference for the draft.'),
      ...this.requireField(facts.hasCurrentPrice, 'pricing', 'missing_current_price', 'A current catalog price is required before requesting a Bazos draft.', 'Add an active valid catalog price.'),
    ];

    issues.push({
      code: 'bazos_policy_deferred',
      field: 'bazosPolicy',
      severity: 'warning',
      message: 'Bazos compliance, identity verification, queueing, and publish decisions remain owned by Bazos.',
      nextAction: 'After catalog fields are ready, request draft creation through the Bazos workflow for policy review.',
    });

    return this.toChannelReadiness({
      channel: 'bazos_draft',
      authority: 'bazos',
      issues,
      readyAction: 'Product truth is ready for a Bazos draft request. Bazos must still decide compliance and publishing.',
      blockedAction: 'Fix the catalog fields listed before requesting a Bazos draft.',
    });
  }

  private catalogBlockingIssues(facts: ProductReadinessFacts): ChannelReadinessIssue[] {
    const issues: ChannelReadinessIssue[] = [];

    if (facts.lifecycle === 'archived') {
      issues.push({
        code: 'archived_product',
        field: 'lifecycle',
        severity: 'blocking',
        message: 'Archived products are not channel-ready.',
        nextAction: 'Move the product to an active lifecycle before channel use.',
      });
    }
    if (facts.lifecycle === 'draft') {
      issues.push({
        code: 'draft_product',
        field: 'lifecycle',
        severity: 'blocking',
        message: 'Draft products need catalog review before channel use.',
        nextAction: 'Complete catalog review and mark the product active.',
      });
    }
    if (facts.lifecycle === 'needs_review') {
      issues.push({
        code: 'needs_review',
        field: 'lifecycle',
        severity: 'warning',
        message: 'Product is flagged for catalog review.',
        nextAction: 'Resolve the catalog review flag before relying on channel readiness.',
      });
    }
    if (!facts.isActive) {
      issues.push({
        code: 'inactive_product',
        field: 'isActive',
        severity: 'blocking',
        message: 'Inactive products are not channel-ready.',
        nextAction: 'Reactivate the product only if owner-approved catalog truth allows it.',
      });
    }
    if (facts.duplicateSku) {
      issues.push({
        code: 'duplicate_sku',
        field: 'sku',
        severity: 'blocking',
        message: 'SKU is shared by multiple products.',
        nextAction: 'Resolve duplicate SKU ownership before channel use.',
      });
    }
    if (facts.duplicateEan) {
      issues.push({
        code: 'duplicate_ean',
        field: 'ean',
        severity: 'blocking',
        message: 'EAN is shared by multiple products.',
        nextAction: 'Resolve duplicate EAN ownership before channel use.',
      });
    }

    return issues;
  }

  private requireField(
    present: boolean,
    field: string,
    code: string,
    message: string,
    nextAction: string,
  ): ChannelReadinessIssue[] {
    if (present) {
      return [];
    }

    return [{ code, field, severity: 'blocking', message, nextAction }];
  }

  private toChannelReadiness(input: {
    channel: string;
    authority: string;
    issues: ChannelReadinessIssue[];
    readyAction: string;
    blockedAction: string;
  }): ChannelReadiness {
    const hasBlockingIssue = input.issues.some((issue) => issue.severity === 'blocking');
    const hasWarning = input.issues.some((issue) => issue.severity === 'warning');
    const status: ChannelReadinessStatus = hasBlockingIssue ? 'blocked' : hasWarning ? 'needs_review' : 'ready';

    return {
      channel: input.channel,
      authority: input.authority,
      ready: !hasBlockingIssue,
      status,
      missingFields: input.issues
        .filter((issue) => issue.severity === 'blocking' && issue.field)
        .map((issue) => issue.field as string),
      issues: input.issues,
      nextAction: hasBlockingIssue ? input.blockedAction : input.readyAction,
    };
  }

  private isPlaceholderMedia(media: { url?: string; title?: string; altText?: string }): boolean {
    const value = [media.url, media.title, media.altText].filter(Boolean).join(' ').toLowerCase();
    return ['placeholder', 'no-image', 'missing-image', 'image-coming-soon'].some((marker) => value.includes(marker));
  }
}
