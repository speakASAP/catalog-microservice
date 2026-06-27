'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BazosListingStatus, productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface BazosPublishPanelProps {
  productId: string;
  defaultCategory?: string;
}

const BASUS_PUBLIC_URL = (process.env.NEXT_PUBLIC_BASUS_PUBLIC_URL || 'https://basus.alfares.cz').replace(/\/$/, '');

export default function BazosPublishPanel({ productId }: BazosPublishPanelProps) {
  const [listingStatus, setListingStatus] = useState<BazosListingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const response = await productsApi.getBazosStatus(productId);
      if (response.success && response.data) {
        setListingStatus(response.data);
      } else {
        setListingStatus(null);
        setError(response.error?.message || 'Basus listing status is unavailable.');
      }
    } catch (statusError) {
      console.error('Failed to load Basus listing status:', statusError);
      setListingStatus(null);
      setError('Basus listing status is unavailable.');
    } finally {
      setLoadingStatus(false);
    }
  }, [productId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const publishedOnBasus = Boolean(listingStatus?.publishedOnBasus || listingStatus?.draft?.publishedOnBasus);
  const listingUrl = listingStatus?.listingUrl || listingStatus?.draft?.listingUrl || null;
  const publishStatus = listingStatus?.draft?.publishStatus || (publishedOnBasus ? 'published' : null);
  const basusPublishUrl = useMemo(
    () => `${BASUS_PUBLIC_URL}/publish?productId=${encodeURIComponent(productId)}`,
    [productId],
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Sell on Basus</h3>
          <p className="text-sm text-gray-600 mt-1">
            Basus owns account verification, listing publication and listing lifetime. Catalog only reads the saved publication result.
          </p>
        </div>
        {publishedOnBasus ? (
          <button
            type="button"
            disabled
            className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold opacity-50 cursor-not-allowed"
          >
            Publish on Basus
          </button>
        ) : (
          <a
            href={basusPublishUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
          >
            Publish on Basus
          </a>
        )}
      </div>

      {loadingStatus ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <div className="flex items-center gap-3"><LoadingSpinner size="sm" /> Checking Basus listing status...</div>
        </div>
      ) : publishedOnBasus ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">This product has an active Basus listing.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-white px-3 py-1 font-semibold text-green-800 border border-green-200">
              Status: {publishStatus || 'published'}
            </span>
          </div>
          {listingUrl && (
            <label className="mt-3 block space-y-2">
              <span className="text-xs font-semibold uppercase text-green-800">Listing URL</span>
              <input
                type="text"
                readOnly
                value={listingUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="w-full rounded-lg border border-green-300 bg-white px-3 py-2 font-mono text-xs text-green-950"
              />
              <a
                href={listingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-4 py-2 bg-white border border-green-300 rounded-lg font-semibold text-green-900 hover:bg-green-100"
              >
                Open listing
              </a>
            </label>
          )}
        </div>
      ) : publishStatus ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Basus has a saved listing workflow for this product.</p>
          <p className="mt-1">Status: {publishStatus}</p>
          <p className="mt-1">Continue publication inside Basus.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">This product can be published on Basus.</p>
          <p className="mt-1">Open Basus to complete verification, category, location and publication there.</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{error}</p>
          <p className="mt-1">Open Basus to check publication details there.</p>
        </div>
      )}
    </div>
  );
}
