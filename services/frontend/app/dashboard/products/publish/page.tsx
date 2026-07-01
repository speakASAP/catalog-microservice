'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BulkMarketplacePublicationResponse,
  MarketplacePublicationChannel,
  Product,
  productsApi,
} from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';

const STORAGE_KEY = 'catalog:bulkPublishSelection';

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

export default function BulkProductPublicationPage() {
  const router = useRouter();
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

  const handlePublish = async () => {
    if (products.length === 0 || publishableMarketplaces.length === 0 || publishing) return;

    setPublishing(true);
    setMessage('Sending selected products to marketplace publication workflows...');
    setResult(null);

    try {
      const response = await productsApi.bulkPublishProducts({
        productIds: selection.productIds,
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
          <Link href="/dashboard/products" className="inline-block bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">🚀 Publish products</h1>
            <p className="text-xl text-emerald-50">{products.length} selected products will be sent to selected marketplaces.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/products')}
            className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-lg text-center"
          >
            Back to products
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900">Selected listings</h2>
          </div>
          <div className="overflow-x-auto max-h-[520px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Brand</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/products/${product.id}`} className="text-sm font-bold text-blue-600 hover:text-blue-700">
                        {product.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{product.sku}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{product.brand || '-'}</td>
                  </tr>
                ))}
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
                return (
                  <label key={marketplace.key} className={`block rounded-xl border-2 p-4 transition-all ${checked ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'} ${available ? 'cursor-pointer' : 'opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!available || publishing}
                        onChange={() => toggleMarketplace(marketplace.key)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="font-extrabold text-gray-900">{marketplace.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{marketplace.description}</div>
                        {!available && marketplace.key === 'bazos' && (
                          <div className="text-sm text-amber-700 mt-2">Bazos identity is not ready: {bazosStatus?.message || 'account status unavailable'}</div>
                        )}
                        {!available && marketplace.key === 'aukro' && (
                          <div className="text-sm text-amber-700 mt-2">Aukro account is not ready: {aukroStatus?.message || 'account status unavailable'}</div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
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
                      <td className="px-6 py-4 text-sm text-gray-700">{row.nextAction || '-'}</td>
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
