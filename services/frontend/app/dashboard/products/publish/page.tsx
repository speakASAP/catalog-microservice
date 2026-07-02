'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BulkMarketplacePublicationResponse,
  MarketplaceContentPreview,
  MarketplacePublicationChannel,
  Product,
  productsApi,
} from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';

const STORAGE_KEY = 'catalog:bulkPublishSelection';
const BAZOS_PUBLIC_URL = (process.env.NEXT_PUBLIC_BAZOS_PUBLIC_URL || 'https://bazos.alfares.cz').replace(/\/$/, '');

const MARKETPLACES: Array<{ key: MarketplacePublicationChannel; label: string; description: string }> = [
  { key: 'flipflop', label: 'FlipFlop', description: 'Make the products available in the FlipFlop storefront projection.' },
  { key: 'bazos', label: 'Bazos', description: 'Create Bazos-owned publication drafts using the connected identity.' },
  { key: 'allegro', label: 'Allegro', description: 'Send products into the Allegro catalog-sell publication workflow.' },
  { key: 'aukro', label: 'Aukro', description: 'Create Aukro-owned catalog drafts from the selected account.' },
];

type SelectionSnapshot = {
  productIds: string[];
  createdAt?: string;
};

function readSelection(): SelectionSnapshot {
  if (typeof window === 'undefined') return { productIds: [] };
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    return {
      productIds: Array.isArray(parsed.productIds) ? parsed.productIds : [],
      createdAt: parsed.createdAt,
    };
  } catch {
    return { productIds: [] };
  }
}

function resultTone(success?: boolean, blocked?: boolean) {
  if (success) return 'bg-emerald-100 text-emerald-800';
  if (blocked) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function buildBazosActionUrl(productIds: string[]) {
  const url = new URL('/client', BAZOS_PUBLIC_URL);
  const returnUrl = typeof window === 'undefined'
    ? 'https://catalog.alfares.cz/dashboard/products/publish'
    : window.location.href;

  url.searchParams.set('source', 'catalog');
  url.searchParams.set('action', 'connect_identity');
  url.searchParams.set('returnUrl', returnUrl);
  productIds.forEach((productId) => url.searchParams.append('productId', productId));
  url.hash = 'bazos-settings';

  return url.toString();
}

function getPrimaryImageUrl(product: Product) {
  const media = product.media || [];
  const primary = media.find((item) => item.isPrimary) || media[0];
  return primary?.thumbnailUrl || primary?.url || null;
}

function renderPlainText(value: string) {
  return value || 'No generated offer content.';
}

function renderStructuredBlocks(preview: MarketplaceContentPreview) {
  const blocks = preview.content.blocks || [];
  if (!blocks.length) {
    return <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{renderPlainText(preview.content.plainText)}</pre>;
  }

  return (
    <div className="space-y-3 text-sm leading-6 text-gray-800">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return <h3 key={index} className="text-base font-extrabold text-gray-950">{block.text}</h3>;
        }
        if (block.type === 'paragraph' || block.type === 'callout') {
          return <p key={index} className={block.type === 'callout' ? 'font-semibold text-gray-950' : ''}>{block.text}</p>;
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

function renderMarketplacePreview(preview: MarketplaceContentPreview) {
  if (preview.format === 'html' && preview.content.html) {
    return <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: preview.content.html }} />;
  }

  if (preview.format === 'structured_blocks') {
    return renderStructuredBlocks(preview);
  }

  return <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{renderPlainText(preview.content.plainText)}</pre>;
}

export default function BulkProductPublicationPage() {
  const [selection, setSelection] = useState<SelectionSnapshot>({ productIds: [] });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<Set<MarketplacePublicationChannel>>(
    () => new Set(MARKETPLACES.map((marketplace) => marketplace.key)),
  );
  const [bazosStatus, setBazosStatus] = useState<any>(null);
  const [aukroStatus, setAukroStatus] = useState<any>(null);
  const [result, setResult] = useState<BulkMarketplacePublicationResponse | null>(null);
  const [previewRequest, setPreviewRequest] = useState<{ productId: string; marketplace: MarketplacePublicationChannel } | null>(null);
  const [preview, setPreview] = useState<MarketplaceContentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setSelection(readSelection());
  }, []);

  const loadProducts = useCallback(async () => {
    if (selection.productIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const responses = await Promise.all(selection.productIds.map((id) => productsApi.getProduct(id)));
      setProducts(responses.flatMap((response) => response.success && response.data ? [response.data] : []));
    } finally {
      setLoading(false);
    }
  }, [selection.productIds]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      productsApi.getBazosAccountStatus(),
      productsApi.getAukroAccountStatus(),
    ]).then(([bazos, aukro]) => {
      if (!mounted) return;
      if (bazos.success) setBazosStatus(bazos.data || null);
      if (aukro.success) setAukroStatus(aukro.data || null);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const selectedBazosIdentity = bazosStatus?.selectedIdentity || null;
  const selectedAukroAccount = aukroStatus?.selectedAccount || null;
  const bazosActionUrl = useMemo(() => buildBazosActionUrl(selection.productIds), [selection.productIds]);

  const isMarketplaceAvailable = useCallback((marketplace: MarketplacePublicationChannel) => {
    if (marketplace === 'bazos' && bazosStatus) return Boolean(bazosStatus.canSell && selectedBazosIdentity?.id);
    if (marketplace === 'aukro' && aukroStatus) return Boolean(aukroStatus.canSell && selectedAukroAccount?.id);
    return true;
  }, [aukroStatus, bazosStatus, selectedAukroAccount?.id, selectedBazosIdentity?.id]);

  const publishableMarketplaces = useMemo(
    () => Array.from(selectedMarketplaces).filter(isMarketplaceAvailable),
    [isMarketplaceAvailable, selectedMarketplaces],
  );

  const toggleMarketplace = (marketplace: MarketplacePublicationChannel) => {
    setSelectedMarketplaces((current) => {
      const next = new Set(current);
      if (next.has(marketplace)) next.delete(marketplace);
      else next.add(marketplace);
      return next;
    });
  };

  const openPreview = async (marketplace: MarketplacePublicationChannel) => {
    const product = products[0];
    if (!product || previewLoading) return;

    setPreviewRequest({ productId: product.id, marketplace });
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      const response = await productsApi.getContentPreview(product.id, marketplace);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Marketplace preview is unavailable.');
      }
      setPreview(response.data);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Marketplace preview is unavailable.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRemoveListing = (productId: string) => {
    setResult(null);
    setMessage(null);
    if (previewRequest?.productId === productId) {
      setPreviewRequest(null);
      setPreview(null);
      setPreviewError(null);
    }
    setProducts((current) => current.filter((product) => product.id !== productId));
    setSelection((current) => {
      const nextSelection = {
        ...current,
        productIds: current.productIds.filter((id) => id !== productId),
      };

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSelection));
      }

      return nextSelection;
    });
  };

  const handlePublish = async () => {
    if (products.length === 0 || publishableMarketplaces.length === 0 || publishing) return;

    setPublishing(true);
    setMessage('Sending selected products to marketplace publication workflows...');
    setResult(null);

    try {
      const productIds = products.map((product) => product.id);
      const response = await productsApi.bulkPublishProducts({
        productIds,
        marketplaces: publishableMarketplaces,
        options: {
          bazos: selectedBazosIdentity?.id ? {
            identityId: selectedBazosIdentity.id,
            category: products[0]?.categories?.[0]?.name || 'ostatni',
            location: selectedBazosIdentity.defaultLocation || undefined,
            useCallerBazosIdentity: true,
          } : undefined,
          aukro: selectedAukroAccount?.id ? { accountId: selectedAukroAccount.id } : undefined,
          allegro: { forceNewDraft: false },
          flipflop: {},
        },
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Bulk publication failed');
      }

      setResult(response.data);
      setMessage(
        response.data.totals.failed > 0
          ? `Publication finished with ${response.data.totals.failed} blocked or failed requests.`
          : `Publication sent ${response.data.totals.succeeded} requests successfully.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Bulk publication failed');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xl font-semibold text-gray-600 mt-4">Loading publication selection...</p>
        </div>
      </div>
    );
  }

  if (selection.productIds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Publish products</h1>
          <p className="text-gray-600 mb-6">Select products from the products table before opening bulk publication.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">🚀 Publish products</h1>
          <p className="text-xl text-emerald-50">{products.length} selected products will be sent to selected marketplaces.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_520px] gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900">Selected listings</h2>
          </div>
          <div className="overflow-x-auto max-h-[520px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Brand</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const imageUrl = getPrimaryImageUrl(product);
                  return (
                    <tr key={product.id}>
                      <td className="px-6 py-4">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.title}
                            className="h-14 w-14 rounded-lg border border-gray-200 object-cover bg-gray-50"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-400">
                            No image
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 min-w-[320px]">
                        <Link href={`/dashboard/products/${product.id}`} className="text-sm font-bold text-blue-600 hover:text-blue-700">
                          {product.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{product.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{product.brand || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveListing(product.id)}
                          disabled={publishing}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-extrabold text-gray-900 mb-4">Marketplaces</h2>
            <div className="space-y-3">
              {MARKETPLACES.map((marketplace) => {
                const available = isMarketplaceAvailable(marketplace.key);
                const checked = selectedMarketplaces.has(marketplace.key) && available;
                const previewActive = previewRequest?.marketplace === marketplace.key;
                return (
                  <div key={marketplace.key} className={`rounded-xl border-2 p-4 transition-all ${checked ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'} ${available ? '' : 'opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <label className={`mt-0.5 flex items-start gap-3 ${available ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!available || publishing}
                          onChange={() => toggleMarketplace(marketplace.key)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-extrabold text-gray-900">{marketplace.label}</span>
                      </label>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-600 mt-1">{marketplace.description}</div>
                        {!available && marketplace.key === 'bazos' && (
                          <div className="text-sm text-amber-700 mt-2 space-y-2">
                            <p>Bazos identity is not ready: {bazosStatus?.message || 'account status unavailable'}</p>
                            <a
                              href={bazosActionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-amber-700 transition-all"
                            >
                              Connect and verify Bazos identity
                            </a>
                          </div>
                        )}
                        {!available && marketplace.key === 'aukro' && (
                          <div className="text-sm text-amber-700 mt-2">Aukro account is not ready: {aukroStatus?.message || 'account status unavailable'}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openPreview(marketplace.key)}
                        disabled={products.length === 0 || previewLoading}
                        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition-all ${previewActive ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-xl font-extrabold text-gray-900">Offer preview</h2>
              <p className="mt-1 text-sm text-gray-600">
                {previewRequest
                  ? `${MARKETPLACES.find((marketplace) => marketplace.key === previewRequest.marketplace)?.label || previewRequest.marketplace} view for ${products.find((product) => product.id === previewRequest.productId)?.title || 'selected listing'}`
                  : 'Choose Preview near a marketplace to see the generated listing.'}
              </p>
            </div>
            <div className="min-h-[260px] p-6">
              {previewLoading ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                  <LoadingSpinner size="sm" />
                </div>
              ) : previewError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{previewError}</div>
              ) : preview ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{preview.label} offer title</div>
                    <h3 className="mt-1 text-lg font-extrabold text-gray-950">{preview.content.title || preview.product.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-600">{preview.format.replace(/_/g, ' ')}</span>
                      {preview.source.legacyDescriptionFallback && (
                        <span className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">legacy fallback</span>
                      )}
                      {preview.overridesApplied.map((key) => (
                        <span key={key} className="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">{key}</span>
                      ))}
                    </div>
                  </div>
                  <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
                    {renderMarketplacePreview(preview)}
                  </div>
                  {preview.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-semibold">Warnings</p>
                      <ul className="mt-2 list-disc pl-5">
                        {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center text-sm font-semibold text-gray-500">
                  No marketplace preview selected.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || products.length === 0 || publishableMarketplaces.length === 0}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-extrabold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? 'Sending...' : `Publish to ${publishableMarketplaces.length} marketplace${publishableMarketplaces.length === 1 ? '' : 's'}`}
            </button>
            {message && <p className="mt-4 text-sm font-semibold text-gray-700">{message}</p>}
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <h2 className="text-xl font-extrabold text-gray-900">Publication results</h2>
            <div className="text-sm font-semibold text-gray-600">
              {result.totals.succeeded} succeeded · {result.totals.blocked} blocked · {result.totals.failed} failed
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Marketplace</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Next action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.results.map((row, index) => {
                  const product = products.find((candidate) => candidate.id === row.productId);
                  return (
                    <tr key={`${row.productId}-${row.marketplace}-${index}`}>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{product?.title || row.productId}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 uppercase">{row.marketplace}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${resultTone(row.success, row.blocked)}`}>
                          {row.success ? 'Sent' : row.blocked ? 'Blocked' : 'Failed'}
                        </span>
                        {(row.message || row.reason) && <div className="text-xs text-gray-500 mt-2 max-w-xl">{row.message || row.reason}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {row.marketplace === 'bazos' && !row.success ? (
                          <a
                            href={bazosActionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-amber-700 transition-all"
                          >
                            Resolve in Bazos
                          </a>
                        ) : (
                          row.nextAction || '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
