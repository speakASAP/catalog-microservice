import { ContentRendererService } from './content-renderer.service';

describe('ContentRendererService', () => {
  const productRepository = { findOne: jest.fn() };
  const profileRepository = { findOne: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sanitizes legacy HTML and renders plain text for Bazos', () => {
    const service = new ContentRendererService(productRepository as any, profileRepository as any);
    const preview = service.render({
      id: 'product-1',
      sku: 'SKU-1',
      title: 'Catalog title',
      description: '<p>Strong &amp; clean</p><ul><li>Size M</li></ul>',
    } as any, 'bazos');

    expect(preview.format).toBe('plain_text');
    expect(preview.content.plainText).toContain('Strong & clean');
    expect(preview.content.plainText).not.toContain('<p>');
    expect(preview.warnings).toContain('legacy_description_contains_html_sanitized');
  });

  it('renders canonical JSON to escaped Allegro HTML with overrides', () => {
    const service = new ContentRendererService(productRepository as any, profileRepository as any);
    const preview = service.render({
      id: 'product-1',
      sku: 'SKU-1',
      title: 'Catalog title',
      descriptionRich: {
        version: 1,
        blocks: [
          { type: 'heading', level: 2, text: 'Benefits <safe>' },
          { type: 'bulleted_list', items: ['Fast', 'Clean'] },
        ],
      },
    } as any, 'allegro', {
      overrides: {
        headline: 'Allegro title',
        descriptionPrefix: 'Only on Allegro',
      },
    } as any);

    expect(preview.content.title).toBe('Allegro title');
    expect(preview.content.html).toContain('<h2>Benefits</h2>');
    expect(preview.content.html).toContain('<li>Fast</li>');
    expect(preview.content.html).toContain('Only on Allegro');
    expect(preview.overridesApplied).toEqual(['headline', 'descriptionPrefix']);
  });

  it('normalizes malformed canonical documents to safe blocks', () => {
    const service = new ContentRendererService(productRepository as any, profileRepository as any);
    const document = service.normalizeDocument({
      version: 999,
      blocks: [
        { type: 'paragraph', text: '<b>Hello</b>' },
        { type: 'unknown', text: 'Ignored' },
        { type: 'table', rows: [['Size', '<i>M</i>']] },
      ],
    });

    expect(document).toEqual({
      version: 1,
      locale: 'cs-CZ',
      blocks: [
        { type: 'paragraph', text: 'Hello' },
        { type: 'table', rows: [['Size', 'M']] },
      ],
    });
  });
});
