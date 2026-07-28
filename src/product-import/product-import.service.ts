import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import axios from 'axios';
import { ProductsService } from '../products/products.service';
import { MediaService } from '../media/media.service';
import { PricingService } from '../pricing/pricing.service';
import { LoggerService } from '../logger/logger.service';
import { descriptionDocumentFromText } from '../content-connectors/content-document';
import { CreateProductDto } from '../products/dto';
import { Product } from '../products/product.entity';
import {
  ImportedListing,
  MarketplaceFetchError,
  MarketplaceImporter,
} from './importers/marketplace-importer.interface';

const MAX_IMAGES = 12;

/** Marks a product whose photos carry the source marketplace's watermark. */
export const WATERMARKED_PHOTOS_TAG = 'photos:watermarked';

export interface ImportResult {
  product: Product;
  sourceMarketplace: string;
  importedImageCount: number;
  /** The caller must warn the user: these photos are not safe to republish as-is. */
  imagesWatermarked: boolean;
}

@Injectable()
export class ProductImportService {
  constructor(
    private readonly importers: MarketplaceImporter[],
    private readonly productsService: ProductsService,
    private readonly mediaService: MediaService,
    private readonly pricingService: PricingService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Names the stored object after the image's path, not the whole URL: transform
   * query strings can themselves contain slashes and filenames (sbazar's carries
   * `/watermark/sbazar.png`), which a naive split would take for the filename. The
   * extension follows the served content-type, since these CDNs re-encode.
   */
  private imageFilename(imageUrl: string, contentType: string): string {
    let base: string;
    try {
      base = new URL(imageUrl).pathname.split('/').filter(Boolean).pop() || 'image';
    } catch {
      base = 'image';
    }

    const subtype = contentType.split(';')[0].trim().split('/')[1]?.toLowerCase();
    const extension = subtype === 'jpeg' ? 'jpg' : subtype;
    if (!extension || !/^[a-z0-9]+$/.test(extension)) {
      return base;
    }

    const stem = base.replace(/\.[^.]+$/, '') || 'image';
    return `${stem}.${extension}`;
  }

  async importFromUrl(url: string, scope: { actor?: unknown } = {}): Promise<ImportResult> {
    const importer = this.importers.find((candidate) => candidate.canHandle(url));
    if (!importer) {
      throw new BadRequestException('Unsupported marketplace URL');
    }

    let listing: ImportedListing;
    try {
      listing = await importer.fetch(url);
    } catch (error) {
      if (error instanceof MarketplaceFetchError) {
        if (error.status === 400) {
          throw new BadRequestException(error.message);
        }
        throw new BadGatewayException({
          message: error.message,
          upstreamStatus: error.status,
        });
      }
      throw error;
    }

    const sku = `${importer.key.toUpperCase()}-${listing.externalId}`;
    const existing = await this.productsService.findBySku(sku, scope as any);
    if (existing) {
      throw new ConflictException({
        message: `This listing was already imported as product ${existing.id}`,
        existingProductId: existing.id,
      });
    }

    const watermarked = Boolean(listing.imagesWatermarked);

    const dto: CreateProductDto = {
      sku,
      title: listing.title,
      description: listing.descriptionText,
      descriptionRich: descriptionDocumentFromText(listing.descriptionText),
      tags: [
        `source:${importer.key}`,
        `source-id:${listing.externalId}`,
        ...(watermarked ? [WATERMARKED_PHOTOS_TAG] : []),
      ],
    };

    const product = await this.productsService.create(dto, scope as any);

    // Priced before photos so a failing image download never costs us the price.
    if (typeof listing.priceAmount === 'number' && Number.isFinite(listing.priceAmount)) {
      try {
        await this.pricingService.upsert({
          productId: product.id,
          basePrice: listing.priceAmount,
          currency: listing.priceCurrency || 'CZK',
          priceType: 'regular',
          isActive: true,
        });
      } catch (error: any) {
        this.logger.warn(
          `Imported product ${product.id} without pricing: ${error?.message}`,
          'ProductImportService',
        );
      }
    }

    let uploadedCount = 0;
    for (const imageUrl of listing.images.slice(0, MAX_IMAGES)) {
      try {
        new URL(imageUrl);
      } catch {
        this.logger.warn(
          `Skipping image with an unparseable URL for product ${product.id}: ${imageUrl}`,
          'ProductImportService',
        );
        continue;
      }

      if (importer.allowedImageUrl && !importer.allowedImageUrl(imageUrl)) {
        this.logger.warn(
          `Skipping image URL not allowed by importer for product ${product.id}: ${imageUrl}`,
          'ProductImportService',
        );
        continue;
      }

      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 15_000,
          maxContentLength: 15 * 1024 * 1024,
          maxBodyLength: 15 * 1024 * 1024,
        });
        const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
        if (!contentType.startsWith('image/')) {
          this.logger.warn(
            `Skipping image with non-image content-type for product ${product.id}: ${imageUrl} (${contentType})`,
            'ProductImportService',
          );
          continue;
        }
        const buffer = Buffer.from(imageResponse.data);
        const originalname = this.imageFilename(imageUrl, contentType);

        await this.mediaService.upload({
          productId: product.id,
          file: { buffer, originalname, mimetype: contentType, size: buffer.length },
          position: uploadedCount,
          isPrimary: uploadedCount === 0,
          ...(watermarked
            ? { metadata: { watermarked: true, watermarkSource: importer.key } }
            : {}),
        });
        uploadedCount += 1;
      } catch (error: any) {
        this.logger.warn(
          `Skipping image that failed to download for product ${product.id}: ${imageUrl} (${error?.message})`,
          'ProductImportService',
        );
      }
    }

    return {
      product,
      sourceMarketplace: importer.key,
      importedImageCount: uploadedCount,
      // Only claim a watermark when photos actually landed.
      imagesWatermarked: watermarked && uploadedCount > 0,
    };
  }
}
