import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SbazarImporter } from './sbazar.importer';
import { MarketplaceFetchError } from './marketplace-importer.interface';

jest.mock('axios');

const listingHtml = readFileSync(join(__dirname, '__fixtures__/sbazar-listing.html'), 'utf-8');

const IMAGE_TRANSFORM =
  '?fl=exf|crr,1.33333,2|res,1536,1152,1|wrm,/watermark/sbazar.png,10,10|webp,75';

const imagePaths = [
  'nO2CysqjGrCDmo65K4HNdSLH/57ba.jpeg',
  'kQMlcCt5zmChFvGEfoHNdSMf/f5d0.jpeg',
  'kQMlcCt5zmChFvGEjlHNdSNT/0843.jpeg',
  'nO2CysqjGrud5y5WeHNdSMt/8844.jpeg',
  'nO2CysqjGrBgjUX3TpHNdSNE/3700.jpeg',
  'kQMlcCt5zmwiaBBFtHHNdSNj/7ac8.jpeg',
  'kQMlcCt5zmBDp4mEq0HNdSNx/f40c.jpeg',
  'nO2CysqjGrB9kIMBUBiHNdSMI/7f6f.jpeg',
  'nO2CysqjGrScbv5wxHNdSMT/c696.jpeg',
];

const expectedImages = imagePaths.map(
  (path) => `https://d46-a.sdn.cz/d_46/c_img_qD_B/${path}${IMAGE_TRANSFORM}`,
);

const listingUrl = 'https://www.sbazar.cz/inzerat/232280241-prodam-peugeot-boxer-2003-22-hdi';

describe('SbazarImporter', () => {
  const importer = new SbazarImporter();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recognizes sbazar.cz listing URLs', () => {
    expect(importer.canHandle(listingUrl)).toBe(true);
    expect(importer.canHandle('https://sbazar.cz/inzerat/1-neco')).toBe(true);
    expect(importer.canHandle('https://aukro.cz/rarita-nuz-dyka-7124914683')).toBe(false);
    expect(importer.canHandle('not a url')).toBe(false);
  });

  it('maps the listing page into an ImportedListing', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: listingHtml });

    const listing = await importer.fetch(`${listingUrl}?utm_source=x`);

    expect(axios.get).toHaveBeenCalledWith(
      listingUrl,
      expect.objectContaining({ timeout: 10_000, responseType: 'text' }),
    );
    expect(listing).toEqual({
      title: 'Prodám peugeot boxer 2003 2.2 hdi',
      descriptionText:
        'pojízdné, horší spojka, tažné, propadla stk, na doježdění/stavba/díly nebo na opravu',
      priceAmount: 15000,
      priceCurrency: 'CZK',
      categoryPath: ['Auto-moto', 'Nákladní a užitkové vozy', 'Do 3,5 t'],
      images: expectedImages,
      imagesWatermarked: true,
      sourceUrl: `${listingUrl}?utm_source=x`,
      sourceMarketplace: 'sbazar',
      externalId: '232280241',
    });
  });

  it('requests the highest-resolution transform sbazar allows', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: listingHtml });

    const listing = await importer.fetch(listingUrl);

    // Raw sdn.cz URLs answer 401 and arbitrary transforms answer 400 — only the
    // presets the page itself references are served.
    for (const image of listing.images) {
      expect(image).toContain('res,1536,1152,1');
      expect(image.startsWith('https://')).toBe(true);
    }
  });

  it('falls back to JSON-LD when the astro island payload is missing', async () => {
    const withoutIsland = listingHtml.replace(/<astro-island[\s\S]*?<\/astro-island>/g, '');
    (axios.get as jest.Mock).mockResolvedValue({ data: withoutIsland });

    const listing = await importer.fetch(listingUrl);

    expect(listing.title).toBe('Prodám peugeot boxer 2003 2.2 hdi');
    expect(listing.priceAmount).toBe(15000);
    expect(listing.priceCurrency).toBe('CZK');
    expect(listing.categoryPath).toEqual(['Auto-moto', 'Nákladní a užitkové vozy', 'Do 3,5 t']);
    expect(listing.externalId).toBe('232280241');
    // JSON-LD only advertises the cover photo.
    expect(listing.images).toHaveLength(1);
    expect(listing.images[0]).toContain('57ba.jpeg');
  });

  it('rejects a URL without a listing id', async () => {
    await expect(importer.fetch('https://www.sbazar.cz/bazar/stashokmisha')).rejects.toMatchObject({
      name: 'MarketplaceFetchError',
      status: 400,
    });
  });

  it('throws MarketplaceFetchError with the upstream status on failure', async () => {
    (axios.get as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
      message: 'Request failed with status code 404',
    });

    await expect(
      importer.fetch('https://www.sbazar.cz/inzerat/999-smazany-inzerat'),
    ).rejects.toMatchObject({ name: 'MarketplaceFetchError', status: 404 });
  });

  it('throws when the page carries no recognizable listing data', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: '<html><body>nope</body></html>' });

    await expect(importer.fetch(listingUrl)).rejects.toBeInstanceOf(MarketplaceFetchError);
  });

  it('only allows image downloads from sbazar CDN hosts over https', () => {
    expect(importer.allowedImageUrl(expectedImages[0])).toBe(true);
    expect(importer.allowedImageUrl('http://d46-a.sdn.cz/x.jpeg')).toBe(false);
    expect(importer.allowedImageUrl('https://evil.example.com/x.jpeg')).toBe(false);
    expect(importer.allowedImageUrl('https://sdn.cz.evil.com/x.jpeg')).toBe(false);
  });
});
