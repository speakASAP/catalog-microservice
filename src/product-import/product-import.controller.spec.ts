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
