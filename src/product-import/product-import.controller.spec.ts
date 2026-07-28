import { ProductImportController } from './product-import.controller';

describe('ProductImportController', () => {
  const product = { id: 'product-1', sku: 'AUKRO-123' };

  const makeController = (imagesWatermarked: boolean, sourceMarketplace = 'aukro') => {
    const importService = {
      importFromUrl: jest.fn().mockResolvedValue({
        product,
        sourceMarketplace,
        importedImageCount: 3,
        imagesWatermarked,
      }),
    };
    const logger = { log: jest.fn(), auditCatalogWrite: jest.fn() };
    return {
      importService,
      logger,
      controller: new ProductImportController(importService as any, logger as any),
    };
  };

  it('delegates to ProductImportService.importFromUrl with the request scope', async () => {
    const { controller, importService, logger } = makeController(false);

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
    expect(result).toEqual({
      success: true,
      data: product,
      meta: { sourceMarketplace: 'aukro', importedImageCount: 3, imagesWatermarked: false },
    });
  });

  it('reports watermarked photos so the client can warn the user', async () => {
    const { controller } = makeController(true, 'sbazar');

    const request = { catalogActor: { type: 'jwt', sub: 'user-1', roles: [] } } as any;
    const result = await controller.importFromUrl(
      { url: 'https://www.sbazar.cz/inzerat/232280241-x' },
      request,
    );

    expect(result.meta).toEqual({
      sourceMarketplace: 'sbazar',
      importedImageCount: 3,
      imagesWatermarked: true,
    });
  });
});
