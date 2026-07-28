import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  ImportedListing,
  MarketplaceFetchError,
  MarketplaceImporter,
} from './marketplace-importer.interface';

/**
 * Sbazar exposes no public JSON API — the listing endpoints all answer 404/301 — so
 * the importer reads the server-rendered page. It parses the Astro island payload
 * first (complete offer, every photo) and falls back to the JSON-LD block (core
 * fields, cover photo only) when the island shape changes.
 */

/**
 * Raw sdn.cz URLs answer 401 and arbitrary transforms answer 400: only the presets
 * the page itself references are served. This is the largest one available —
 * ~864x1152 WebP, watermarked by sbazar. There is no unwatermarked variant.
 */
const IMAGE_TRANSFORM =
  '?fl=exf|crr,1.33333,2|res,1536,1152,1|wrm,/watermark/sbazar.png,10,10|webp,75';

const HTML_ENTITIES: Record<string, string> = {
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#34;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

interface SbazarOffer {
  id?: number;
  name?: string;
  description?: string;
  price?: number;
  category?: { name?: string };
  images?: Array<{ url?: string }>;
}

interface JsonLdProduct {
  '@type'?: string;
  name?: string;
  description?: string;
  offers?: Array<{ price?: number; priceCurrency?: string }>;
  image?: Array<{ contentUrl?: string }>;
}

interface JsonLdWebPage {
  '@type'?: string;
  breadcrumb?: {
    itemListElement?: Array<{ position?: number; name?: string }>;
  };
}

@Injectable()
export class SbazarImporter implements MarketplaceImporter {
  readonly key = 'sbazar';

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return /(^|\.)sbazar\.cz$/.test(hostname);
    } catch {
      return false;
    }
  }

  async fetch(url: string): Promise<ImportedListing> {
    const itemId = this.extractItemId(url);
    const pageUrl = this.canonicalUrl(url);

    let response;
    try {
      response = await axios.get<string>(pageUrl, {
        timeout: 10_000,
        responseType: 'text',
        headers: {
          // The page is served to browsers only; a bare client gets a challenge page.
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'cs,en;q=0.8',
        },
      });
    } catch (error: any) {
      const status = error?.response?.status || 502;
      throw new MarketplaceFetchError(
        `Failed to fetch Sbazar listing ${itemId}: ${error?.message || 'unknown error'}`,
        status,
      );
    }

    const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    const offer = this.parseIslandOffer(html);
    const { product, webPage } = this.parseJsonLd(html);

    const title = offer?.name || product?.name;
    const description = offer?.description ?? product?.description;

    if (!title) {
      throw new MarketplaceFetchError(
        `Sbazar page for listing ${itemId} carried no recognizable offer data`,
        502,
      );
    }

    const offerNode = product?.offers?.[0];
    const priceAmount = typeof offer?.price === 'number' ? offer.price : offerNode?.price;

    const images = offer?.images?.length
      ? offer.images
          .map((image) => this.normalizeImageUrl(image?.url))
          .filter((image): image is string => Boolean(image))
      : (product?.image ?? [])
          .map((image) => this.normalizeImageUrl(image?.contentUrl))
          .filter((image): image is string => Boolean(image));

    return {
      title,
      descriptionText: description ?? '',
      priceAmount: typeof priceAmount === 'number' ? priceAmount : undefined,
      priceCurrency: offerNode?.priceCurrency || (priceAmount !== undefined ? 'CZK' : undefined),
      categoryPath: this.categoryPath(webPage, offer),
      images,
      // Every preset sbazar serves burns in its watermark — there is no clean variant.
      imagesWatermarked: images.length > 0,
      sourceUrl: url,
      sourceMarketplace: this.key,
      externalId: String(offer?.id ?? itemId),
    };
  }

  allowedImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && /(^|\.)sdn\.cz$/.test(parsed.hostname);
    } catch {
      return false;
    }
  }

  /** Listing URLs look like /inzerat/<id>-<slug>. */
  private extractItemId(url: string): string {
    let pathname: string;
    try {
      pathname = new URL(url).pathname;
    } catch {
      throw new MarketplaceFetchError(`Not a valid Sbazar URL: ${url}`, 400);
    }

    const match = pathname.match(/\/inzerat\/(\d+)/);
    if (!match) {
      throw new MarketplaceFetchError(`Could not find an Sbazar listing id in URL: ${url}`, 400);
    }
    return match[1];
  }

  /** Drops tracking query strings so the fetch hits a cacheable canonical page. */
  private canonicalUrl(url: string): string {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  }

  /**
   * Astro serializes island props as [type, value] tuples, nested all the way down.
   * Unwrapping structurally keeps this independent of Astro's type table: the
   * exotic types (Date, Map, RegExp) yield their raw payload, which is all the
   * string and number fields we read need.
   */
  private decodeAstroProps(node: unknown): unknown {
    if (Array.isArray(node)) {
      if (node.length === 2 && typeof node[0] === 'number') {
        return this.decodeAstroProps(node[1]);
      }
      return node.map((entry) => this.decodeAstroProps(entry));
    }

    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>).map(([key, value]) => [
          key,
          this.decodeAstroProps(value),
        ]),
      );
    }

    return node;
  }

  private parseIslandOffer(html: string): SbazarOffer | null {
    const islands = html.match(/<astro-island[^>]*\sprops="([^"]*)"[^>]*>/g) ?? [];

    for (const island of islands) {
      const rawProps = island.match(/\sprops="([^"]*)"/)?.[1];
      if (!rawProps || !rawProps.includes('ssrOffer')) {
        continue;
      }

      let decoded: Record<string, unknown>;
      try {
        decoded = this.decodeAstroProps(
          JSON.parse(this.decodeHtmlEntities(rawProps)),
        ) as Record<string, unknown>;
      } catch {
        continue;
      }

      const offer = (decoded.ssrOffer ?? decoded.mainOffer) as SbazarOffer | undefined;
      if (offer?.name) {
        return offer;
      }
    }

    return null;
  }

  private parseJsonLd(html: string): { product?: JsonLdProduct; webPage?: JsonLdWebPage } {
    const blocks =
      html.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ) ?? [];

    let product: JsonLdProduct | undefined;
    let webPage: JsonLdWebPage | undefined;

    for (const block of blocks) {
      const body = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        continue;
      }

      for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
        const type = (entry as { '@type'?: string })?.['@type'];
        if (type === 'Product' && !product) {
          product = entry as JsonLdProduct;
        } else if (type === 'WebPage' && !webPage) {
          webPage = entry as JsonLdWebPage;
        }
      }
    }

    return { product, webPage };
  }

  /**
   * Breadcrumbs read Sbazar.cz > Auto-moto > ... — the site root carries no catalog
   * meaning, so it is dropped.
   */
  private categoryPath(webPage?: JsonLdWebPage, offer?: SbazarOffer): string[] | undefined {
    const crumbs = [...(webPage?.breadcrumb?.itemListElement ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((crumb) => crumb.name)
      .filter((name): name is string => Boolean(name))
      .filter((name) => !/^sbazar\.cz$/i.test(name));

    if (crumbs.length > 0) {
      return crumbs;
    }

    return offer?.category?.name ? [offer.category.name] : undefined;
  }

  /** Island URLs are protocol-relative and untransformed; JSON-LD carries a smaller preset. */
  private normalizeImageUrl(url?: string): string | null {
    if (!url) {
      return null;
    }

    const absolute = url.startsWith('//') ? `https:${url}` : url;
    let parsed: URL;
    try {
      parsed = new URL(absolute);
    } catch {
      return null;
    }

    return `${parsed.origin}${parsed.pathname}${IMAGE_TRANSFORM}`;
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&(quot|apos|#39|#34|lt|gt|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&amp;/g, '&');
  }
}
