export type MarketplaceContentKey = 'allegro' | 'bazos' | 'aukro' | 'flipflop';

export type ProductContentBlock =
  | { type: 'heading'; level?: number; text?: string }
  | { type: 'paragraph'; text?: string }
  | { type: 'bulleted_list'; items?: string[] }
  | { type: 'numbered_list'; items?: string[] }
  | { type: 'table'; rows?: string[][] }
  | { type: 'callout'; text?: string; tone?: string };

export type ProductContentDocument = {
  version: 1;
  locale?: string;
  blocks: ProductContentBlock[];
};

export type MarketplaceContentPreview = {
  marketplace: MarketplaceContentKey;
  label: string;
  format: 'html' | 'plain_text' | 'structured_blocks';
  product: {
    id: string;
    sku: string;
    title: string;
  };
  content: {
    title: string;
    plainText: string;
    html?: string;
    blocks?: ProductContentBlock[];
    sections?: Array<{ title?: string; body: string }>;
  };
  source: {
    canonicalDocumentVersion: number;
    legacyDescriptionFallback: boolean;
    sourceHash: string;
    generatedAt: string;
  };
  overridesApplied: string[];
  warnings: string[];
};

const HTML_TAG_RE = /<[^>]*>/g;
const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function cleanPlainText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return decodeHtmlEntities(String(value))
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(HTML_TAG_RE, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function descriptionDocumentFromText(text: unknown, locale = 'cs-CZ'): ProductContentDocument | null {
  const cleaned = cleanPlainText(text);
  if (!cleaned) {
    return null;
  }

  const blocks = cleaned
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return { type: 'bulleted_list' as const, items: lines.map((line) => cleanPlainText(line.replace(/^[-*]\s+/, ''))) };
      }
      if (lines.length > 1 && lines.every((line) => /^\d+[.)]\s+/.test(line))) {
        return { type: 'numbered_list' as const, items: lines.map((line) => cleanPlainText(line.replace(/^\d+[.)]\s+/, ''))) };
      }
      return { type: 'paragraph' as const, text: cleanPlainText(chunk) };
    });

  return { version: 1, locale, blocks };
}

export function normalizeDescriptionDocument(
  value: unknown,
  fallbackText?: unknown,
  locale = 'cs-CZ',
): ProductContentDocument | null {
  if (!value || typeof value !== 'object') {
    return descriptionDocumentFromText(fallbackText, locale);
  }

  const input = value as Partial<ProductContentDocument>;
  const rawBlocks = Array.isArray(input.blocks) ? input.blocks : [];
  const blocks: ProductContentBlock[] = [];

  for (const rawBlock of rawBlocks) {
    if (!rawBlock || typeof rawBlock !== 'object') {
      continue;
    }
    const block = rawBlock as any;
    const type = String(block.type || '').trim();
    if (type === 'heading') {
      const text = cleanPlainText(block.text);
      if (text) {
        const level = Number(block.level);
        blocks.push({ type: 'heading', level: Number.isFinite(level) ? Math.min(Math.max(Math.floor(level), 1), 4) : 2, text });
      }
    } else if (type === 'paragraph') {
      const text = cleanPlainText(block.text);
      if (text) blocks.push({ type: 'paragraph', text });
    } else if (type === 'bulleted_list' || type === 'numbered_list') {
      const items = Array.isArray(block.items)
        ? block.items.map((item: unknown) => cleanPlainText(item)).filter(Boolean)
        : [];
      if (items.length) blocks.push({ type, items } as ProductContentBlock);
    } else if (type === 'table') {
      const rows = Array.isArray(block.rows)
        ? block.rows
            .map((row: unknown) => Array.isArray(row) ? row.map((cell) => cleanPlainText(cell)).filter(Boolean) : [])
            .filter((row) => row.length)
        : [];
      if (rows.length) blocks.push({ type: 'table', rows });
    } else if (type === 'callout') {
      const text = cleanPlainText(block.text);
      if (text) blocks.push({ type: 'callout', text, tone: cleanPlainText(block.tone) || 'note' });
    }
  }

  if (!blocks.length) {
    return descriptionDocumentFromText(fallbackText, locale);
  }

  return {
    version: 1,
    locale: cleanPlainText(input.locale) || locale,
    blocks,
  };
}

export function descriptionDocumentToPlainText(document: ProductContentDocument | null | undefined): string {
  if (!document?.blocks?.length) {
    return '';
  }

  return document.blocks
    .map((block) => {
      if (block.type === 'heading') return cleanPlainText(block.text);
      if (block.type === 'paragraph') return cleanPlainText(block.text);
      if (block.type === 'callout') return cleanPlainText(block.text);
      if (block.type === 'bulleted_list') return (block.items || []).map((item) => `- ${cleanPlainText(item)}`).join('\n');
      if (block.type === 'numbered_list') return (block.items || []).map((item, index) => `${index + 1}. ${cleanPlainText(item)}`).join('\n');
      if (block.type === 'table') return (block.rows || []).map((row) => row.map(cleanPlainText).join(' | ')).join('\n');
      return '';
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    const key = String(entity);
    if (key.startsWith('#x')) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (key.startsWith('#')) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITY_MAP[key] ?? match;
  });
}
