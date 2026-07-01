import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { ProductMarketplaceProfile } from '../marketplace-fields/marketplace-profile.entity';
import { Product } from '../products/product.entity';
import {
  cleanPlainText,
  descriptionDocumentFromText,
  descriptionDocumentToPlainText,
  escapeHtml,
  MarketplaceContentKey,
  MarketplaceContentPreview,
  normalizeDescriptionDocument,
  ProductContentBlock,
  ProductContentDocument,
} from './content-document';

const MARKETPLACES: Array<{ key: MarketplaceContentKey; label: string; format: MarketplaceContentPreview['format'] }> = [
  { key: 'allegro', label: 'Allegro', format: 'html' },
  { key: 'bazos', label: 'Bazoš', format: 'plain_text' },
  { key: 'aukro', label: 'Aukro', format: 'plain_text' },
  { key: 'flipflop', label: 'FlipFlop', format: 'structured_blocks' },
];

@Injectable()
export class ContentRendererService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductMarketplaceProfile)
    private readonly profileRepository: Repository<ProductMarketplaceProfile>,
  ) {}

  getSupportedMarketplaces() {
    return MARKETPLACES.map(({ key, label, format }) => ({ marketplace: key, label, format }));
  }

  async renderPreviews(productId: string): Promise<MarketplaceContentPreview[]> {
    const product = await this.loadProduct(productId);
    return Promise.all(MARKETPLACES.map(({ key }) => this.renderProductContent(product, key)));
  }

  async renderPreview(productId: string, marketplace: string): Promise<MarketplaceContentPreview> {
    const product = await this.loadProduct(productId);
    return this.renderProductContent(product, this.normalizeMarketplace(marketplace));
  }

  async renderProductContent(product: Product, marketplace: MarketplaceContentKey): Promise<MarketplaceContentPreview> {
    const profile = await this.profileRepository.findOne({ where: { productId: product.id, marketplace } });
    return this.render(product, marketplace, profile);
  }

  render(
    product: Product,
    marketplace: MarketplaceContentKey,
    profile: ProductMarketplaceProfile | null = null,
  ): MarketplaceContentPreview {
    const marketplaceConfig = MARKETPLACES.find((item) => item.key === marketplace);
    if (!marketplaceConfig) {
      throw new NotFoundException(`Unsupported marketplace content connector: ${marketplace}`);
    }

    const document = normalizeDescriptionDocument(product.descriptionRich, product.description);
    const legacyDescriptionFallback = !product.descriptionRich && Boolean(product.description?.trim());
    const overrides = profile?.overrides || {};
    const title = cleanPlainText(overrides.headline) || product.title;
    const prefix = cleanPlainText(overrides.descriptionPrefix);
    const suffix = cleanPlainText(overrides.descriptionSuffix);
    const basePlainText = descriptionDocumentToPlainText(document) || cleanPlainText(product.description);
    const plainText = [prefix, basePlainText, suffix].filter(Boolean).join('\n\n').trim();
    const blocks = this.applyTextOverrides(document?.blocks || [], prefix, suffix);
    const warnings = this.warningsFor(document, product, marketplace);
    const sourceHash = this.hashContent({ marketplace, title, plainText, blocks, overrides });
    const generatedAt = new Date().toISOString();

    const content = this.renderContent(marketplace, title, blocks, plainText);
    return {
      marketplace,
      label: marketplaceConfig.label,
      format: marketplaceConfig.format,
      product: {
        id: product.id,
        sku: product.sku,
        title: product.title,
      },
      content,
      source: {
        canonicalDocumentVersion: document?.version ?? 1,
        legacyDescriptionFallback,
        sourceHash,
        generatedAt,
      },
      overridesApplied: ['headline', 'descriptionPrefix', 'descriptionSuffix'].filter((key) => cleanPlainText((overrides as any)[key])),
      warnings,
    };
  }

  normalizeDocument(value: unknown, fallbackText?: unknown): ProductContentDocument | null {
    return normalizeDescriptionDocument(value, fallbackText);
  }

  documentFromText(text: unknown): ProductContentDocument | null {
    return descriptionDocumentFromText(text);
  }

  toPlainText(document: ProductContentDocument | null | undefined): string {
    return descriptionDocumentToPlainText(document);
  }

  toCleanPlainText(text: unknown): string {
    return cleanPlainText(text);
  }

  private async loadProduct(productId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['categories', 'media', 'pricing'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    return product;
  }

  private normalizeMarketplace(marketplace: string): MarketplaceContentKey {
    const normalized = String(marketplace || '').trim().toLowerCase();
    if (MARKETPLACES.some((item) => item.key === normalized)) {
      return normalized as MarketplaceContentKey;
    }
    throw new NotFoundException(`Unsupported marketplace content connector: ${marketplace}`);
  }

  private renderContent(
    marketplace: MarketplaceContentKey,
    title: string,
    blocks: ProductContentBlock[],
    plainText: string,
  ): MarketplaceContentPreview['content'] {
    if (marketplace === 'allegro') {
      return {
        title,
        plainText,
        html: this.renderHtml(blocks),
        sections: blocks.map((block) => this.blockToSection(block)).filter((section): section is { title?: string; body: string } => Boolean(section)),
      };
    }

    if (marketplace === 'flipflop') {
      return {
        title,
        plainText,
        html: this.renderHtml(blocks),
        blocks,
      };
    }

    return {
      title,
      plainText,
    };
  }

  private renderHtml(blocks: ProductContentBlock[]): string {
    return blocks.map((block) => {
      if (block.type === 'heading') {
        const level = Math.min(Math.max(Number(block.level || 2), 1), 4);
        return `<h${level}>${escapeHtml(block.text)}</h${level}>`;
      }
      if (block.type === 'paragraph') return `<p>${escapeHtml(block.text)}</p>`;
      if (block.type === 'callout') return `<p><strong>${escapeHtml(block.text)}</strong></p>`;
      if (block.type === 'bulleted_list') {
        return `<ul>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
      }
      if (block.type === 'numbered_list') {
        return `<ol>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
      }
      if (block.type === 'table') {
        return `<table>${(block.rows || []).map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</table>`;
      }
      return '';
    }).filter(Boolean).join('\n');
  }

  private blockToSection(block: ProductContentBlock): { title?: string; body: string } | null {
    if (block.type === 'heading') return { title: cleanPlainText(block.text), body: '' };
    if (block.type === 'paragraph') return { body: cleanPlainText(block.text) };
    if (block.type === 'callout') return { body: cleanPlainText(block.text) };
    if (block.type === 'bulleted_list') return { body: (block.items || []).map((item) => `- ${cleanPlainText(item)}`).join('\n') };
    if (block.type === 'numbered_list') return { body: (block.items || []).map((item, index) => `${index + 1}. ${cleanPlainText(item)}`).join('\n') };
    if (block.type === 'table') return { body: (block.rows || []).map((row) => row.map(cleanPlainText).join(' | ')).join('\n') };
    return null;
  }

  private applyTextOverrides(blocks: ProductContentBlock[], prefix: string, suffix: string): ProductContentBlock[] {
    return [
      ...(prefix ? [{ type: 'paragraph' as const, text: prefix }] : []),
      ...blocks,
      ...(suffix ? [{ type: 'paragraph' as const, text: suffix }] : []),
    ];
  }

  private warningsFor(
    document: ProductContentDocument | null,
    product: Product,
    marketplace: MarketplaceContentKey,
  ): string[] {
    const warnings: string[] = [];
    if (!document?.blocks?.length) {
      warnings.push('missing_canonical_description');
    }
    if (product.description && /<[^>]+>/.test(product.description)) {
      warnings.push('legacy_description_contains_html_sanitized');
    }
    if (marketplace === 'bazos' && descriptionDocumentToPlainText(document).length > 4500) {
      warnings.push('bazos_plain_text_may_be_too_long');
    }
    return warnings;
  }

  private hashContent(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
}
