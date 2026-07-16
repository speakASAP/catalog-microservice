import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import axios from 'axios';
import { ProductsService } from '../products/products.service';
import { MediaService } from '../media/media.service';
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

@Injectable()
export class ProductImportService {
  constructor(
    private readonly importers: MarketplaceImporter[],
    private readonly productsService: ProductsService,
    private readonly mediaService: MediaService,
    private readonly logger: LoggerService,
  ) {}

  async importFromUrl(url: string, scope: { actor?: unknown } = {}): Promise<Product> {
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

    const dto: CreateProductDto = {
      sku,
      title: listing.title,
      description: listing.descriptionText,
      descriptionRich: descriptionDocumentFromText(listing.descriptionText),
      tags: [`source:${importer.key}`, `source-id:${listing.externalId}`],
    };

    const product = await this.productsService.create(dto, scope as any);

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
        const originalname = imageUrl.split('/').pop() || 'image.jpg';

        await this.mediaService.upload({
          productId: product.id,
          file: { buffer, originalname, mimetype: contentType, size: buffer.length },
          position: uploadedCount,
          isPrimary: uploadedCount === 0,
        });
        uploadedCount += 1;
      } catch (error: any) {
        this.logger.warn(
          `Skipping image that failed to download for product ${product.id}: ${imageUrl} (${error?.message})`,
          'ProductImportService',
        );
      }
    }

    return product;
  }
}
