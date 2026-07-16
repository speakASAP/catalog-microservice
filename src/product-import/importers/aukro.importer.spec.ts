import axios from 'axios';
import { AukroImporter } from './aukro.importer';
import { MarketplaceFetchError } from './marketplace-importer.interface';

const fixture = require('./__fixtures__/aukro-offer-detail.json');

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
      { timeout: 10_000 },
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

  it('returns an empty images array when the upstream response has no images', async () => {
    const { images, ...fixtureWithoutImages } = fixture;
    (axios.get as jest.Mock).mockResolvedValue({ data: fixtureWithoutImages });

    const listing = await importer.fetch('https://aukro.cz/rarita-nuz-dyka-7124914683');

    expect(listing.images).toEqual([]);
  });

  it('rejects with MarketplaceFetchError status 502 when the response is missing a name', async () => {
    const { name, ...fixtureWithoutName } = fixture;
    (axios.get as jest.Mock).mockResolvedValue({ data: fixtureWithoutName });

    await expect(
      importer.fetch('https://aukro.cz/rarita-nuz-dyka-7124914683'),
    ).rejects.toMatchObject({ name: 'MarketplaceFetchError', status: 502 });
  });
});
