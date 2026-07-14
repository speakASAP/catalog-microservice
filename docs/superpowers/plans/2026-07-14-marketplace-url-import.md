# Marketplace URL Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a seller paste a marketplace listing URL (starting with Aukro.cz) and get back a draft `Product` with title, description, and photos already populated.

**Architecture:** A new `product-import` NestJS module with a pluggable `MarketplaceImporter` registry (one adapter class per marketplace). `AukroImporter` calls Aukro's public JSON API directly (`GET https://aukro.cz/backend-web/api/offers/{itemId}/offerDetail` — verified with a live `curl`, no auth or JS rendering needed). `ProductImportService` picks the matching importer, creates the draft product via the existing `ProductsService.create()`, then downloads each photo and feeds it into the existing `MediaService.upload()`. A new frontend box on the "create product" page calls the new endpoint.

**Tech Stack:** NestJS, TypeORM, `axios` (already a dependency, used the same way `ProductsService` and `LoggerService` already use it), Jest + `ts-jest` for tests, Next.js frontend calling the existing `apiClient`.

## Global Constraints

- New products always start as `lifecycle: 'draft'` — this already happens unconditionally inside `ProductsService.create()` (see `withLifecycleDefaults` at `src/products/products.service.ts:1305-1312`), so the import flow does not need to set `lifecycle` itself.
- Follow the existing lightweight test style used in `src/products/products.service.spec.ts`: instantiate services directly with `new ServiceClass(...)` and plain `jest.fn()` mocks — no `@nestjs/testing` `TestingModule` needed for these unit tests.
- Test files must match `src/**/*.spec.ts` (see `jest.config.js:6`) to be picked up by `npm test`.
- Write endpoints must be guarded with `@UseGuards(CatalogAuthGuard)` and `@RequireCatalogRoles('catalog:authenticated')`, matching every other mutating endpoint on `ProductsController`.
- Cap image downloads at 12 per import (per the design spec) to bound worst-case import time/cost.

---

### Task 1: `MarketplaceImporter` interface and the Aukro adapter

**Files:**
- Create: `src/product-import/importers/marketplace-importer.interface.ts`
- Create: `src/product-import/importers/aukro.importer.ts`
- Create: `src/product-import/importers/__fixtures__/aukro-offer-detail.json`
- Test: `src/product-import/importers/aukro.importer.spec.ts`

**Interfaces:**
- Produces: `ImportedListing` type, `MarketplaceFetchError` class, `MarketplaceImporter` interface, `AukroImporter` class (both from `marketplace-importer.interface.ts` and `aukro.importer.ts` respectively) — consumed by Task 2.

- [ ] **Step 1: Create the shared importer interface file**

`src/product-import/importers/marketplace-importer.interface.ts`:

```ts
export interface ImportedListing {
  title: string;
  descriptionText: string;
  priceAmount?: number;
  priceCurrency?: string;
  categoryPath?: string[];
  images: string[]; // ordered, best resolution available
  sourceUrl: string;
  sourceMarketplace: string; // e.g. 'aukro'
  externalId: string;
}

export class MarketplaceFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'MarketplaceFetchError';
  }
}

export interface MarketplaceImporter {
  readonly key: string;
  canHandle(url: string): boolean;
  fetch(url: string): Promise<ImportedListing>;
}
```

- [ ] **Step 2: Save a real API response fixture**

`src/product-import/importers/__fixtures__/aukro-offer-detail.json` (trimmed real response captured from `https://aukro.cz/backend-web/api/offers/7124914683/offerDetail`, keeping only the fields the importer reads):

```json
{
  "id": 7124914683,
  "name": "Rarita Nůž Dýka CCCP Sovětský Bodák Armáda Válka Důstojník Značen NKVD",
  "descriptionStripped": "Nabízím velice zajímavý nůž CCCP, na čepeli značený NKVD-viz foto, v krásném původním stavu",
  "category": [
    { "id": 8531, "shortName": "Sběratelství", "name": "Sběratelství", "level": 0 },
    { "id": 8473, "shortName": "Vojenské", "name": "Vojenské sběratelské předměty", "level": 1 },
    { "id": 6509, "shortName": "Zbraně", "name": "Sběratelské zbraně", "level": 2 },
    { "id": 6507, "shortName": "Chladné zbraně", "name": "Chladné zbraně", "level": 3 }
  ],
  "images": {
    "original": [
      { "position": 0, "url": "https://cdn.aukro.cz/images/sk1751574261895/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-233703706.jpeg" },
      { "position": 1, "url": "https://cdn.aukro.cz/images/sk1749673090939/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-231803164.jpeg" },
      { "position": 2, "url": "https://cdn.aukro.cz/images/sk1751574262945/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-233703708.jpeg" }
    ]
  }
}
```

- [ ] **Step 3: Write the failing test for `AukroImporter`**

`src/product-import/importers/aukro.importer.spec.ts`:

```ts
import axios from 'axios';
import { AukroImporter } from './aukro.importer';
import { MarketplaceFetchError } from './marketplace-importer.interface';
import fixture from './__fixtures__/aukro-offer-detail.json';

jest.mock('axios');

describe('AukroImporter', () => {
  const importer = new AukroImporter();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recognizes aukro.cz listing URLs', () => {
    expect(importer.canHandle('https://aukro.cz/rarita-nuz-dyka-7124914683')).toBe(true);
    expect(importer.canHandle('https://www.aukro.cz/rarita-nuz-dyka-7124914683')).toBe(true);
    expect(importer.canHandle('https://bazos.cz/something-123')).toBe(false);
  });

  it('extracts the item id from the URL and maps the API response', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: fixture });

    const url =
      'https://aukro.cz/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-7124914683?utm_source=x';
    const listing = await importer.fetch(url);

    expect(axios.get).toHaveBeenCalledWith(
      'https://aukro.cz/backend-web/api/offers/7124914683/offerDetail',
    );
    expect(listing).toEqual({
      title: 'Rarita Nůž Dýka CCCP Sovětský Bodák Armáda Válka Důstojník Značen NKVD',
      descriptionText:
        'Nabízím velice zajímavý nůž CCCP, na čepeli značený NKVD-viz foto, v krásném původním stavu',
      categoryPath: ['Sběratelství', 'Vojenské sběratelské předměty', 'Sběratelské zbraně', 'Chladné zbraně'],
      images: [
        'https://cdn.aukro.cz/images/sk1751574261895/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-233703706.jpeg',
        'https://cdn.aukro.cz/images/sk1749673090939/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-231803164.jpeg',
        'https://cdn.aukro.cz/images/sk1751574262945/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-233703708.jpeg',
      ],
      sourceUrl: url,
      sourceMarketplace: 'aukro',
      externalId: '7124914683',
    });
  });

  it('throws MarketplaceFetchError with the upstream status on failure', async () => {
    (axios.get as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
      message: 'Request failed with status code 404',
    });

    await expect(
      importer.fetch('https://aukro.cz/some-deleted-listing-999'),
    ).rejects.toMatchObject({ name: 'MarketplaceFetchError', status: 404 });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx jest src/product-import/importers/aukro.importer.spec.ts`
Expected: FAIL — `Cannot find module './aukro.importer'`

- [ ] **Step 5: Implement `AukroImporter`**

`src/product-import/importers/aukro.importer.ts`:

```ts
import axios from 'axios';
import {
  ImportedListing,
  MarketplaceFetchError,
  MarketplaceImporter,
} from './marketplace-importer.interface';

interface AukroCategoryEntry {
  name: string;
}

interface AukroOfferDetailResponse {
  id: number;
  name: string;
  descriptionStripped: string;
  category?: AukroCategoryEntry[];
  images: {
    original: Array<{ position: number; url: string }>;
  };
}

export class AukroImporter implements MarketplaceImporter {
  readonly key = 'aukro';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return /(^|\.)aukro\.cz$/.test(hostname);
    } catch {
      return false;
    }
  }

  async fetch(url: string): Promise<ImportedListing> {
    const itemId = this.extractItemId(url);
    const endpoint = `https://aukro.cz/backend-web/api/offers/${itemId}/offerDetail`;

    let response;
    try {
      response = await axios.get<AukroOfferDetailResponse>(endpoint);
    } catch (error: any) {
      const status = error?.response?.status || 502;
      throw new MarketplaceFetchError(
        `Failed to fetch Aukro listing ${itemId}: ${error?.message || 'unknown error'}`,
        status,
      );
    }

    const data = response.data;
    return {
      title: data.name,
      descriptionText: data.descriptionStripped,
      categoryPath: data.category?.map((entry) => entry.name),
      images: [...data.images.original]
        .sort((a, b) => a.position - b.position)
        .map((image) => image.url),
      sourceUrl: url,
      sourceMarketplace: this.key,
      externalId: String(data.id),
    };
  }

  private extractItemId(url: string): string {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/-(\d+)$/);
    if (!match) {
      throw new MarketplaceFetchError(`Could not find an Aukro item id in URL: ${url}`, 400);
    }
    return match[1];
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/product-import/importers/aukro.importer.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/product-import/importers
git commit -m "feat: add Aukro marketplace importer"
```

---

### Task 2: `ProductImportService`

**Files:**
- Create: `src/product-import/product-import.service.ts`
- Test: `src/product-import/product-import.service.spec.ts`

**Interfaces:**
- Consumes: `MarketplaceImporter`, `ImportedListing`, `MarketplaceFetchError` (Task 1); `ProductsService.create(dto: CreateProductDto, scope): Promise<Product>` and `ProductsService.findBySku(sku: string, scope): Promise<Product | null>` (`src/products/products.service.ts:792`, `:897`); `MediaService.upload(input: { productId: string; file: { buffer: Buffer; originalname: string; mimetype: string; size: number }; position?: number; isPrimary?: boolean }): Promise<Media>` (`src/media/media.service.ts:59`); `descriptionDocumentFromText(text: unknown, locale?: string): ProductContentDocument | null` (`src/content-connectors/content-document.ts:80`).
- Produces: `ProductImportService.importFromUrl(url: string, scope: { actor?: unknown }): Promise<Product>` — consumed by Task 3. Throws `BadRequestException` (unsupported URL), `BadGatewayException` (upstream fetch failure), `ConflictException` (duplicate SKU, with `existingProductId` on the response body).

- [ ] **Step 1: Write the failing tests**

`src/product-import/product-import.service.spec.ts`:

```ts
import axios from 'axios';
import { BadRequestException, BadGatewayException, ConflictException } from '@nestjs/common';
import { ProductImportService } from './product-import.service';
import { MarketplaceFetchError } from './importers/marketplace-importer.interface';

jest.mock('axios');

describe('ProductImportService', () => {
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const makeImporter = (overrides: Partial<{ canHandle: boolean; listing: any }> = {}) => ({
    key: 'aukro',
    canHandle: jest.fn().mockReturnValue(overrides.canHandle ?? true),
    fetch: jest.fn().mockResolvedValue(
      overrides.listing ?? {
        title: 'Test Listing',
        descriptionText: 'A test description',
        images: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
        sourceUrl: 'https://aukro.cz/test-123',
        sourceMarketplace: 'aukro',
        externalId: '123',
      },
    ),
  });

  const makeProductsService = (existing: any = null) => ({
    findBySku: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue({ id: 'product-1', sku: 'AUKRO-123', title: 'Test Listing' }),
  });

  const makeMediaService = () => ({
    upload: jest.fn().mockResolvedValue({ id: 'media-1' }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a draft product and uploads each image', async () => {
    const importer = makeImporter();
    const productsService = makeProductsService();
    const mediaService = makeMediaService();
    (axios.get as jest.Mock).mockResolvedValue({
      data: Buffer.from('fake-image-bytes'),
      headers: { 'content-type': 'image/jpeg' },
    });

    const service = new ProductImportService(
      [importer as any],
      productsService as any,
      mediaService as any,
      logger as any,
    );

    const product = await service.importFromUrl('https://aukro.cz/test-123', {});

    expect(productsService.findBySku).toHaveBeenCalledWith('AUKRO-123', {});
    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'AUKRO-123',
        title: 'Test Listing',
        description: 'A test description',
        tags: ['source:aukro', 'source-id:123'],
      }),
      {},
    );
    expect(mediaService.upload).toHaveBeenCalledTimes(2);
    expect(mediaService.upload).toHaveBeenNthCalledWith(1, expect.objectContaining({
      productId: 'product-1',
      position: 0,
      isPrimary: true,
    }));
    expect(mediaService.upload).toHaveBeenNthCalledWith(2, expect.objectContaining({
      productId: 'product-1',
      position: 1,
      isPrimary: false,
    }));
    expect(product.id).toBe('product-1');
  });

  it('throws BadRequestException when no importer can handle the URL', async () => {
    const importer = makeImporter({ canHandle: false });
    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      makeMediaService() as any,
      logger as any,
    );

    await expect(
      service.importFromUrl('https://not-a-marketplace.example.com/x', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('wraps a MarketplaceFetchError as BadGatewayException', async () => {
    const importer = makeImporter();
    (importer.fetch as jest.Mock).mockRejectedValue(new MarketplaceFetchError('listing gone', 404));
    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      makeMediaService() as any,
      logger as any,
    );

    await expect(service.importFromUrl('https://aukro.cz/test-123', {})).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws ConflictException when the SKU was already imported', async () => {
    const importer = makeImporter();
    const productsService = makeProductsService({ id: 'existing-product-1', sku: 'AUKRO-123' });
    const service = new ProductImportService(
      [importer as any],
      productsService as any,
      makeMediaService() as any,
      logger as any,
    );

    await expect(service.importFromUrl('https://aukro.cz/test-123', {})).rejects.toMatchObject({
      response: expect.objectContaining({ existingProductId: 'existing-product-1' }),
    });
    expect(productsService.create).not.toHaveBeenCalled();
  });

  it('skips an image that fails to download without failing the import', async () => {
    const importer = makeImporter();
    const productsService = makeProductsService();
    const mediaService = makeMediaService();
    (axios.get as jest.Mock)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        data: Buffer.from('fake-image-bytes'),
        headers: { 'content-type': 'image/jpeg' },
      });

    const service = new ProductImportService(
      [importer as any],
      productsService as any,
      mediaService as any,
      logger as any,
    );

    const product = await service.importFromUrl('https://aukro.cz/test-123', {});

    expect(mediaService.upload).toHaveBeenCalledTimes(1);
    expect(mediaService.upload).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'product-1',
      position: 0,
      isPrimary: true,
    }));
    expect(product.id).toBe('product-1');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/product-import/product-import.service.spec.ts`
Expected: FAIL — `Cannot find module './product-import.service'`

- [ ] **Step 3: Implement `ProductImportService`**

`src/product-import/product-import.service.ts`:

```ts
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
import { MarketplaceFetchError, MarketplaceImporter } from './importers/marketplace-importer.interface';

const MAX_IMAGES = 12;

@Injectable()
export class ProductImportService {
  constructor(
    private readonly importers: MarketplaceImporter[],
    private readonly productsService: ProductsService,
    private readonly mediaService: MediaService,
    private readonly logger: LoggerService,
  ) {}

  async importFromUrl(url: string, scope: { actor?: unknown } = {}): Promise<ReturnType<ProductsService['create']> extends Promise<infer P> ? P : never> {
    const importer = this.importers.find((candidate) => candidate.canHandle(url));
    if (!importer) {
      throw new BadRequestException('Unsupported marketplace URL');
    }

    let listing;
    try {
      listing = await importer.fetch(url);
    } catch (error) {
      if (error instanceof MarketplaceFetchError) {
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
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imageResponse.data);
        const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/product-import/product-import.service.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/product-import/product-import.service.ts src/product-import/product-import.service.spec.ts
git commit -m "feat: add ProductImportService to build draft products from marketplace listings"
```

---

### Task 3: Controller, module wiring, and app registration

**Files:**
- Create: `src/product-import/product-import.controller.ts`
- Create: `src/product-import/product-import.module.ts`
- Modify: `src/app.module.ts`
- Test: `src/product-import/product-import.controller.spec.ts`

**Interfaces:**
- Consumes: `ProductImportService.importFromUrl(url, scope)` (Task 2); `CatalogAuthGuard`, `RequireCatalogRoles` (`src/auth/catalog-auth.guard.ts`, `src/auth/catalog-auth.decorator.ts`); `LoggerService` (`src/logger/logger.service.ts`).
- Produces: `POST /api/products/import-from-url` endpoint, mounted via `AppModule`.

- [ ] **Step 1: Write the failing controller test**

`src/product-import/product-import.controller.spec.ts`:

```ts
import { ProductImportController } from './product-import.controller';

describe('ProductImportController', () => {
  it('delegates to ProductImportService.importFromUrl with the request scope', async () => {
    const importService = {
      importFromUrl: jest.fn().mockResolvedValue({ id: 'product-1', sku: 'AUKRO-123' }),
    };
    const logger = { log: jest.fn(), auditCatalogWrite: jest.fn() };
    const controller = new ProductImportController(importService as any, logger as any);

    const request = { catalogActor: { type: 'jwt', sub: 'user-1', roles: [] } } as any;
    const result = await controller.importFromUrl({ url: 'https://aukro.cz/test-123' }, request);

    expect(importService.importFromUrl).toHaveBeenCalledWith('https://aukro.cz/test-123', {
      actor: request.catalogActor,
    });
    expect(logger.auditCatalogWrite).toHaveBeenCalledWith(request, expect.objectContaining({
      action: 'import_from_url',
      resourceType: 'product',
      resourceId: 'product-1',
    }));
    expect(result).toEqual({ success: true, data: { id: 'product-1', sku: 'AUKRO-123' } });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/product-import/product-import.controller.spec.ts`
Expected: FAIL — `Cannot find module './product-import.controller'`

- [ ] **Step 3: Implement the controller**

`src/product-import/product-import.controller.ts`:

```ts
import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, IsUrl } from 'class-validator';
import { ProductImportService } from './product-import.service';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';

export class ImportFromUrlDto {
  @IsString()
  @IsUrl({ require_protocol: true })
  url: string;
}

@Controller('products')
export class ProductImportController {
  constructor(
    private readonly productImportService: ProductImportService,
    private readonly logger: LoggerService,
  ) {}

  @Post('import-from-url')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  @HttpCode(HttpStatus.CREATED)
  async importFromUrl(
    @Body() body: ImportFromUrlDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/import-from-url url=${body.url}`, 'ProductImportController');
    const product = await this.productImportService.importFromUrl(body.url, {
      actor: request.catalogActor,
    });
    this.logger.auditCatalogWrite(request, {
      action: 'import_from_url',
      resourceType: 'product',
      resourceId: product.id,
      metadata: { sku: product.sku },
    });
    return { success: true, data: product };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/product-import/product-import.controller.spec.ts`
Expected: PASS

- [ ] **Step 5: Create the module**

`src/product-import/product-import.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ProductsService } from '../products/products.service';
import { MediaModule } from '../media/media.module';
import { MediaService } from '../media/media.service';
import { LoggerModule } from '../logger/logger.module';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from './product-import.service';
import { AukroImporter } from './importers/aukro.importer';

@Module({
  imports: [ProductsModule, MediaModule, LoggerModule],
  controllers: [ProductImportController],
  providers: [
    CatalogAuthGuard,
    AukroImporter,
    {
      provide: ProductImportService,
      useFactory: (
        aukroImporter: AukroImporter,
        productsService: ProductsService,
        mediaService: MediaService,
        logger: LoggerService,
      ) => new ProductImportService([aukroImporter], productsService, mediaService, logger),
      inject: [AukroImporter, ProductsService, MediaService, LoggerService],
    },
  ],
})
export class ProductImportModule {}
```

NestJS resolves the `ProductsService`, `MediaService`, and `LoggerService`
providers here because `ProductsModule` exports `ProductsService`
(`src/products/products.module.ts:22`), `MediaModule` exports `MediaService`
(`src/media/media.module.ts:13`), and `LoggerModule` provides `LoggerService`
globally-per-import in the same way every other feature module already
consumes it.

- [ ] **Step 6: Wire the module into `AppModule`**

Modify `src/app.module.ts`: add the import alongside the other feature modules
(after `BusinessHealthModule` at line 22, and in the `imports` array after
`BusinessHealthModule` at line 68):

```ts
import { BusinessHealthModule } from './business-health/business-health.module';
import { ProductImportModule } from './product-import/product-import.module';
```

```ts
    BpcpEventsModule,
    BundlesModule,
    BusinessHealthModule,
    ProductImportModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
git add src/product-import/product-import.controller.ts src/product-import/product-import.module.ts src/product-import/product-import.controller.spec.ts src/app.module.ts
git commit -m "feat: expose POST /api/products/import-from-url endpoint"
```

---

### Task 4: Frontend API client function

**Files:**
- Modify: `services/frontend/lib/api/products.ts`

**Interfaces:**
- Consumes: `apiClient.post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>>` (`services/frontend/lib/api/client.ts:109`); `Product` interface (already defined at `services/frontend/lib/api/products.ts:19`).
- Produces: `productsApi.importFromUrl(url: string): Promise<ApiResponse<Product>>` — consumed by Task 5.

- [ ] **Step 1: Add the API function**

In `services/frontend/lib/api/products.ts`, add inside the `productsApi` object
(next to `createProduct`, after line 790's closing `},`):

```ts
  async importFromUrl(url: string) {
    return apiClient.post<Product>('/products/import-from-url', { url });
  },
```

- [ ] **Step 2: Type-check the frontend**

Run: `cd services/frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add services/frontend/lib/api/products.ts
git commit -m "feat(frontend): add importFromUrl API client function"
```

---

### Task 5: "Import from URL" box on the create-product page

**Files:**
- Modify: `services/frontend/app/dashboard/products/new/page.tsx`

**Interfaces:**
- Consumes: `productsApi.importFromUrl(url: string)` (Task 4).

- [ ] **Step 1: Add import-from-url state and handler**

In `services/frontend/app/dashboard/products/new/page.tsx`, add state near the
existing `loading` state (after line 11):

```tsx
  const [loading, setLoading] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
```

Add a handler above `handleSubmit` (after line 47's `removePhotoUrlField`):

```tsx
  const handleImportFromUrl = async () => {
    const url = importUrl.trim();
    if (!url) {
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      const response = await productsApi.importFromUrl(url);
      if (response.success && response.data) {
        router.push(`/dashboard/products/${response.data.id}`);
      } else {
        setImportError(response.error?.message || 'Failed to import from URL');
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import from URL');
    } finally {
      setImportLoading(false);
    }
  };
```

- [ ] **Step 2: Add the UI box above the manual form**

In the same file, insert this block right after the header `<div>` (after the
closing `</div>` at line 121, before `<form onSubmit={handleSubmit} ...>` at
line 123):

```tsx
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-3 border-2 border-indigo-100">
        <h2 className="text-lg font-bold text-gray-800">Import from a marketplace link</h2>
        <p className="text-sm text-gray-600">
          Paste a listing URL (e.g. an Aukro.cz auction) to create a draft product with its
          title, description, and photos already filled in.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://aukro.cz/..."
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            onClick={handleImportFromUrl}
            disabled={importLoading || !importUrl.trim()}
            className="whitespace-nowrap bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importLoading ? <LoadingSpinner size="sm" /> : 'Create draft from link'}
          </button>
        </div>
        {importError && (
          <p className="text-sm font-semibold text-red-600">{importError}</p>
        )}
      </div>
```

- [ ] **Step 3: Type-check the frontend**

Run: `cd services/frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `cd services/frontend && npm run dev`, open
`http://localhost:3000/dashboard/products/new` (adjust port per
`package.json` dev script), paste the Aukro URL from this feature's design
spec, click "Create draft from link", and confirm it redirects to the new
draft product's page with title, description, and photos populated. This
requires the backend (`npm run start:dev` in the repo root) to be running
locally and reachable at the frontend's configured `NEXT_PUBLIC_API_URL` /
`API_URL`.

- [ ] **Step 5: Commit**

```bash
git add services/frontend/app/dashboard/products/new/page.tsx
git commit -m "feat(frontend): add import-from-URL box to create product page"
```

---

## Self-Review Notes

- **Spec coverage:** pluggable importer registry (Task 1 interface + Task 3
  module array), Aukro adapter via plain JSON API (Task 1), draft product
  creation with provenance tags (Task 2), image download + existing
  `MediaService.upload()` reuse with a 12-image cap and per-image failure
  isolation (Task 2), new guarded endpoint (Task 3), duplicate-SKU 409 with
  existing product id (Task 2), frontend entry point redirecting to the
  created product (Task 5) — all covered.
- **Type consistency:** `ProductImportService.importFromUrl` signature
  matches its use in both the controller test/impl (Task 3) and the
  frontend's expectations (`{ id, sku, ... }` shaped like the existing
  `Product` type). `MarketplaceFetchError` and `ImportedListing` names are
  used identically across Tasks 1–2.
- **No unresolved placeholders.**
