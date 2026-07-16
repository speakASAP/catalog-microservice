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
  /** Returns true if the service may download this image URL. */
  allowedImageUrl?(url: string): boolean;
}
