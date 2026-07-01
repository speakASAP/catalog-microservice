'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MarketplaceContentKey, MarketplaceContentPreview, Product, productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface ProductContentPreviewPanelProps {
  product: Product;
}

const CHANNELS: Array<{ key: 'catalog' | MarketplaceContentKey; label: string }> = [
  { key: 'catalog', label: 'Catalog' },
  { key: 'allegro', label: 'Allegro' },
  { key: 'bazos', label: 'Bazoš' },
  { key: 'aukro', label: 'Aukro' },
  { key: 'flipflop', label: 'FlipFlop' },
];

function renderPlainText(value: string) {
  return value || 'No generated content.';
}

function renderBlocks(preview: MarketplaceContentPreview) {
  const blocks = preview.content.blocks || [];
  if (!blocks.length) {
    return <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{renderPlainText(preview.content.plainText)}</pre>;
  }

  return (
    <div className="space-y-3 text-sm text-gray-800">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return <h3 key={index} className="text-lg font-bold text-gray-950">{block.text}</h3>;
        }
        if (block.type === 'paragraph' || block.type === 'callout') {
          return <p key={index} className={block.type === 'callout' ? 'font-semibold' : ''}>{block.text}</p>;
        }
        if (block.type === 'bulleted_list') {
          return <ul key={index} className="list-disc space-y-1 pl-5">{(block.items || []).map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>;
        }
        if (block.type === 'numbered_list') {
          return <ol key={index} className="list-decimal space-y-1 pl-5">{(block.items || []).map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>;
        }
        if (block.type === 'table') {
          return (
            <div key={index} className="overflow-hidden rounded-lg border border-gray-200">
              {(block.rows || []).map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-2 border-t border-gray-200 first:border-t-0">
                  {row.map((cell, cellIndex) => (
                    <div key={cellIndex} className="px-3 py-2 text-sm">{cell}</div>
                  ))}
                </div>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function ProductContentPreviewPanel({ product }: ProductContentPreviewPanelProps) {
  const [active, setActive] = useState<'catalog' | MarketplaceContentKey>('catalog');
  const [previews, setPreviews] = useState<MarketplaceContentPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productsApi.getContentPreviews(product.id);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Content previews are unavailable.');
      }
      setPreviews(response.data.previews || []);
    } catch (loadError) {
      setPreviews([]);
      setError(loadError instanceof Error ? loadError.message : 'Content previews are unavailable.');
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  const activePreview = useMemo(
    () => previews.find((preview) => preview.marketplace === active),
    [active, previews],
  );

  const catalogDescription = product.description || '';

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Content previews</h2>
          <p className="text-sm text-gray-600">Canonical description and connector output.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((channel) => (
            <button
              key={channel.key}
              type="button"
              onClick={() => setActive(channel.key)}
              className={`rounded-xl border px-4 py-2 text-sm font-bold ${active === channel.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {channel.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
          <LoadingSpinner size="sm" />
        </div>
      ) : active === 'catalog' ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{renderPlainText(catalogDescription)}</pre>
          {product.descriptionRich && (
            <details className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-bold text-gray-900">Canonical JSON</summary>
              <pre className="mt-3 max-h-80 overflow-auto text-xs text-gray-700">{JSON.stringify(product.descriptionRich, null, 2)}</pre>
            </details>
          )}
        </div>
      ) : activePreview ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold uppercase text-gray-600">{activePreview.format.replace(/_/g, ' ')}</span>
              {activePreview.source.legacyDescriptionFallback && (
                <span className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">legacy fallback</span>
              )}
              {activePreview.overridesApplied.map((key) => (
                <span key={key} className="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">{key}</span>
              ))}
            </div>
            {activePreview.format === 'html' && activePreview.content.html ? (
              <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: activePreview.content.html }} />
            ) : activePreview.format === 'structured_blocks' ? (
              renderBlocks(activePreview)
            ) : (
              <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{renderPlainText(activePreview.content.plainText)}</pre>
            )}
          </div>

          {activePreview.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Warnings</p>
              <ul className="mt-2 list-disc pl-5">
                {activePreview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error || 'Preview is unavailable.'}
        </div>
      )}
    </section>
  );
}
