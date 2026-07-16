import { Injectable } from '@nestjs/common';
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
  images?: {
    original?: Array<{ position: number; url: string }>;
  };
}

@Injectable()
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
      response = await axios.get<AukroOfferDetailResponse>(endpoint, { timeout: 10_000 });
    } catch (error: any) {
      const status = error?.response?.status || 502;
      throw new MarketplaceFetchError(
        `Failed to fetch Aukro listing ${itemId}: ${error?.message || 'unknown error'}`,
        status,
      );
    }

    const data = response.data;
    if (!data.id || !data.name) {
      throw new MarketplaceFetchError(
        `Aukro response missing required fields for listing ${itemId}`,
        502,
      );
    }

    return {
      title: data.name,
      descriptionText: data.descriptionStripped,
      categoryPath: data.category?.map((entry) => entry.name),
      images: [...(data.images?.original ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((image) => image.url),
      sourceUrl: url,
      sourceMarketplace: this.key,
      externalId: String(data.id),
    };
  }

  allowedImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && /(^|\.)aukro\.cz$/.test(parsed.hostname);
    } catch {
      return false;
    }
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
