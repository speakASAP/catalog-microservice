import axios from 'axios';
import { BadRequestException, BadGatewayException, ConflictException } from '@nestjs/common';
import { ProductImportService } from './product-import.service';
import { MarketplaceFetchError } from './importers/marketplace-importer.interface';

jest.mock('axios');

describe('ProductImportService', () => {
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const makeImporter = (
    overrides: Partial<{
      canHandle: boolean;
      listing: any;
      allowedImageUrl: (url: string) => boolean;
    }> = {},
  ) => ({
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
    ...(overrides.allowedImageUrl
      ? { allowedImageUrl: jest.fn(overrides.allowedImageUrl) }
      : {}),
  });

  const makeProductsService = (existing: any = null) => ({
    findBySku: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue({ id: 'product-1', sku: 'AUKRO-123', title: 'Test Listing' }),
  });

  const makeMediaService = () => ({
    upload: jest.fn().mockResolvedValue({ id: 'media-1' }),
  });

  const makePricingService = () => ({
    upsert: jest.fn().mockResolvedValue({ id: 'pricing-1' }),
  });

  let pricingService = makePricingService();

  beforeEach(() => {
    jest.clearAllMocks();
    pricingService = makePricingService();
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
      pricingService as any,
      logger as any,
    );

    const { product } = await service.importFromUrl('https://aukro.cz/test-123', {});

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
      pricingService as any,
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
      pricingService as any,
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
      pricingService as any,
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
      pricingService as any,
      logger as any,
    );

    const { product } = await service.importFromUrl('https://aukro.cz/test-123', {});

    expect(mediaService.upload).toHaveBeenCalledTimes(1);
    expect(mediaService.upload).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'product-1',
      position: 0,
      isPrimary: true,
    }));
    expect(product.id).toBe('product-1');
  });

  it('throws BadRequestException when the importer rejects with a 400 MarketplaceFetchError', async () => {
    const importer = makeImporter();
    (importer.fetch as jest.Mock).mockRejectedValue(
      new MarketplaceFetchError('Could not find an item id in URL', 400),
    );
    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      makeMediaService() as any,
      pricingService as any,
      logger as any,
    );

    await expect(service.importFromUrl('https://aukro.cz/not-a-listing', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('skips an image URL the importer does not allow, without calling axios for it', async () => {
    const importer = makeImporter({
      listing: {
        title: 'Test Listing',
        descriptionText: 'A test description',
        images: ['https://evil.example.com/a.jpg', 'https://cdn.aukro.cz/b.jpg'],
        sourceUrl: 'https://aukro.cz/test-123',
        sourceMarketplace: 'aukro',
        externalId: '123',
      },
      allowedImageUrl: (url: string) => url.includes('aukro.cz'),
    });
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
      pricingService as any,
      logger as any,
    );

    await service.importFromUrl('https://aukro.cz/test-123', {});

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith('https://cdn.aukro.cz/b.jpg', expect.anything());
    expect(mediaService.upload).toHaveBeenCalledTimes(1);
    expect(mediaService.upload).toHaveBeenCalledWith(expect.objectContaining({
      position: 0,
      isPrimary: true,
    }));
  });

  it('skips an image whose response content-type is not an image type', async () => {
    const importer = makeImporter();
    const productsService = makeProductsService();
    const mediaService = makeMediaService();
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({
        data: Buffer.from('<html>error</html>'),
        headers: { 'content-type': 'text/html' },
      })
      .mockResolvedValueOnce({
        data: Buffer.from('fake-image-bytes'),
        headers: { 'content-type': 'image/jpeg' },
      });

    const service = new ProductImportService(
      [importer as any],
      productsService as any,
      mediaService as any,
      pricingService as any,
      logger as any,
    );

    const { product } = await service.importFromUrl('https://aukro.cz/test-123', {});

    expect(mediaService.upload).toHaveBeenCalledTimes(1);
    expect(mediaService.upload).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'product-1',
      position: 0,
      isPrimary: true,
    }));
    expect(product.id).toBe('product-1');
  });

  it('names uploads from the image path, ignoring filenames inside the query string', async () => {
    // Sbazar's transform query contains `/watermark/sbazar.png` — splitting the whole
    // URL on "/" would name every object after the watermark.
    const importer = makeImporter({
      listing: {
        title: 'Peugeot',
        descriptionText: '',
        images: [
          'https://d46-a.sdn.cz/d_46/c_img_qD_B/abc/57ba.jpeg?fl=exf|res,1536,1152,1|wrm,/watermark/sbazar.png,10,10|webp,75',
        ],
        sourceUrl: 'https://www.sbazar.cz/inzerat/232280241-x',
        sourceMarketplace: 'sbazar',
        externalId: '232280241',
      },
    });
    const mediaService = makeMediaService();
    (axios.get as jest.Mock).mockResolvedValue({
      data: Buffer.from('fake-image-bytes'),
      headers: { 'content-type': 'image/webp' },
    });

    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      mediaService as any,
      pricingService as any,
      logger as any,
    );

    await service.importFromUrl('https://www.sbazar.cz/inzerat/232280241-x', {});

    expect(mediaService.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        file: expect.objectContaining({ originalname: '57ba.webp', mimetype: 'image/webp' }),
      }),
    );
  });

  it('tags the product and its media when the source watermarks its photos', async () => {
    const importer = makeImporter({
      listing: {
        title: 'Peugeot',
        descriptionText: '',
        images: ['https://d46-a.sdn.cz/a/57ba.jpeg?fl=exf|webp,75'],
        imagesWatermarked: true,
        sourceUrl: 'https://www.sbazar.cz/inzerat/232280241-x',
        sourceMarketplace: 'sbazar',
        externalId: '232280241',
      },
    });
    importer.key = 'sbazar';
    const productsService = makeProductsService();
    const mediaService = makeMediaService();
    (axios.get as jest.Mock).mockResolvedValue({
      data: Buffer.from('fake-image-bytes'),
      headers: { 'content-type': 'image/webp' },
    });

    const service = new ProductImportService(
      [importer as any],
      productsService as any,
      mediaService as any,
      pricingService as any,
      logger as any,
    );

    const result = await service.importFromUrl('https://www.sbazar.cz/inzerat/232280241-x', {});

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.arrayContaining(['source:sbazar', 'photos:watermarked']),
      }),
      {},
    );
    expect(mediaService.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { watermarked: true, watermarkSource: 'sbazar' },
      }),
    );
    expect(result.imagesWatermarked).toBe(true);
    expect(result.importedImageCount).toBe(1);
    expect(result.sourceMarketplace).toBe('sbazar');
  });

  it('does not claim a watermark when the source serves clean photos', async () => {
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
      pricingService as any,
      logger as any,
    );

    const result = await service.importFromUrl('https://aukro.cz/test-123', {});

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['source:aukro', 'source-id:123'] }),
      {},
    );
    expect(mediaService.upload).not.toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.anything() }),
    );
    expect(result.imagesWatermarked).toBe(false);
  });

  it('does not warn about watermarks when no photo actually landed', async () => {
    const importer = makeImporter({
      listing: {
        title: 'Peugeot',
        descriptionText: '',
        images: ['https://d46-a.sdn.cz/a/57ba.jpeg'],
        imagesWatermarked: true,
        sourceUrl: 'https://www.sbazar.cz/inzerat/232280241-x',
        sourceMarketplace: 'sbazar',
        externalId: '232280241',
      },
    });
    (axios.get as jest.Mock).mockRejectedValue(new Error('network error'));

    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      makeMediaService() as any,
      pricingService as any,
      logger as any,
    );

    const result = await service.importFromUrl('https://www.sbazar.cz/inzerat/232280241-x', {});

    expect(result.importedImageCount).toBe(0);
    expect(result.imagesWatermarked).toBe(false);
  });

  it('persists the listing price when the importer supplies one', async () => {
    const importer = makeImporter({
      listing: {
        title: 'Prodám peugeot boxer 2003 2.2 hdi',
        descriptionText: 'pojízdné, horší spojka',
        priceAmount: 15000,
        priceCurrency: 'CZK',
        images: [],
        sourceUrl: 'https://www.sbazar.cz/inzerat/232280241-x',
        sourceMarketplace: 'sbazar',
        externalId: '232280241',
      },
    });

    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      makeMediaService() as any,
      pricingService as any,
      logger as any,
    );

    await service.importFromUrl('https://www.sbazar.cz/inzerat/232280241-x', {});

    expect(pricingService.upsert).toHaveBeenCalledWith({
      productId: 'product-1',
      basePrice: 15000,
      currency: 'CZK',
      priceType: 'regular',
      isActive: true,
    });
  });

  it('defaults the currency to CZK when the listing omits it', async () => {
    const importer = makeImporter({
      listing: {
        title: 'Bez měny',
        descriptionText: '',
        priceAmount: 2500,
        images: [],
        sourceUrl: 'https://www.sbazar.cz/inzerat/1-x',
        sourceMarketplace: 'sbazar',
        externalId: '1',
      },
    });

    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      makeMediaService() as any,
      pricingService as any,
      logger as any,
    );

    await service.importFromUrl('https://www.sbazar.cz/inzerat/1-x', {});

    expect(pricingService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ basePrice: 2500, currency: 'CZK' }),
    );
  });

  it('does not write pricing when the listing carries no price', async () => {
    const importer = makeImporter();

    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      makeMediaService() as any,
      pricingService as any,
      logger as any,
    );

    await service.importFromUrl('https://aukro.cz/test-123', {});

    expect(pricingService.upsert).not.toHaveBeenCalled();
  });

  it('still returns the product when pricing fails to save', async () => {
    const importer = makeImporter({
      listing: {
        title: 'Pricing selže',
        descriptionText: '',
        priceAmount: 999,
        priceCurrency: 'CZK',
        images: [],
        sourceUrl: 'https://www.sbazar.cz/inzerat/2-x',
        sourceMarketplace: 'sbazar',
        externalId: '2',
      },
    });
    pricingService.upsert.mockRejectedValue(new Error('db down'));

    const service = new ProductImportService(
      [importer as any],
      makeProductsService() as any,
      makeMediaService() as any,
      pricingService as any,
      logger as any,
    );

    const { product } = await service.importFromUrl('https://www.sbazar.cz/inzerat/2-x', {});

    expect(product.id).toBe('product-1');
    expect(logger.warn).toHaveBeenCalled();
  });
});
