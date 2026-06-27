'use client';

import { useCallback, useEffect, useState } from 'react';
import { productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface ChannelSalesPanelProps {
  productId: string;
}

type ChannelKey = 'allegro' | 'flipflop';

type ChannelResult = {
  success?: boolean;
  blocked?: boolean;
  message?: string;
  listingUrl?: string | null;
  status?: string | null;
  attempt?: { status?: string | null } | null;
  availableOnFlipFlop?: boolean;
  [key: string]: any;
};

const CHANNELS: Array<{
  key: ChannelKey;
  title: string;
  description: string;
  button: string;
}> = [
  {
    key: 'allegro',
    title: 'Sell on Allegro',
    description: 'Prepare an Allegro draft from this catalog product and continue in Allegro when no listing URL is known.',
    button: 'Sell on Allegro',
  },
  {
    key: 'flipflop',
    title: 'Sell on FlipFlop',
    description: 'Check the FlipFlop storefront projection and keep the public product URL visible when it is available.',
    button: 'Sell on FlipFlop',
  },
];

const unwrapResult = (result: any): ChannelResult | null => result?.data || result || null;

export default function ChannelSalesPanel({ productId }: ChannelSalesPanelProps) {
  const [loading, setLoading] = useState<ChannelKey | null>(null);
  const [checkingFlipFlop, setCheckingFlipFlop] = useState(false);
  const [results, setResults] = useState<Record<ChannelKey, ChannelResult | null>>({ allegro: null, flipflop: null });

  const runAction = useCallback(async (channel: ChannelKey) => {
    setLoading(channel);
    try {
      const response = channel === 'allegro'
        ? await productsApi.sellOnAllegro(productId)
        : await productsApi.sellOnFlipFlop(productId);
      setResults((current) => ({ ...current, [channel]: unwrapResult(response) }));
    } catch (error) {
      setResults((current) => ({
        ...current,
        [channel]: {
          success: false,
          message: error instanceof Error ? error.message : `Failed to prepare ${channel} sale.`,
        },
      }));
    } finally {
      setLoading(null);
    }
  }, [productId]);

  useEffect(() => {
    let cancelled = false;

    const loadFlipFlopListing = async () => {
      setCheckingFlipFlop(true);
      try {
        const response = await productsApi.getFlipFlopStatus(productId);
        if (!cancelled) {
          setResults((current) => ({ ...current, flipflop: unwrapResult(response) }));
        }
      } catch {
        if (!cancelled) {
          setResults((current) => ({ ...current, flipflop: null }));
        }
      } finally {
        if (!cancelled) setCheckingFlipFlop(false);
      }
    };

    loadFlipFlopListing();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {CHANNELS.map((channel) => {
        const payload = results[channel.key];
        const listingUrl = payload?.listingUrl || null;
        const hasListing = Boolean(listingUrl && payload?.success !== false && !payload?.blocked);
        const status = payload?.status || payload?.attempt?.status || (payload?.availableOnFlipFlop ? 'available' : null);
        const blocked = payload?.success === false || payload?.blocked;
        const buttonDisabled = loading !== null || hasListing || (channel.key === 'flipflop' && checkingFlipFlop);

        return (
          <div key={channel.key} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{channel.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
              </div>
              <button
                type="button"
                onClick={() => runAction(channel.key)}
                disabled={buttonDisabled}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === channel.key || (channel.key === 'flipflop' && checkingFlipFlop)
                  ? <LoadingSpinner size="sm" />
                  : channel.button}
              </button>
            </div>

            {payload && (
              <div className={`rounded-xl border p-4 text-sm ${blocked ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                <p className="font-semibold">
                  {hasListing
                    ? `This product has an active ${channel.title.replace('Sell on ', '')} listing.`
                    : blocked
                      ? payload.message || 'Channel action needs attention.'
                      : payload.message || 'Channel action prepared.'}
                </p>
                {status && <p className="mt-1">Status: {status}</p>}
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
            )}
          </div>
        );
      })}
    </div>
  );
}
