'use client';

import { useState } from 'react';
import { productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface ChannelSalesPanelProps {
  productId: string;
}

type ChannelKey = 'allegro' | 'flipflop';

const CHANNELS: Array<{
  key: ChannelKey;
  title: string;
  description: string;
  button: string;
}> = [
  {
    key: 'allegro',
    title: 'Sell on Allegro',
    description: 'Prepare an Allegro draft from this catalog product and continue with Allegro confirmation.',
    button: 'Sell on Allegro',
  },
  {
    key: 'flipflop',
    title: 'Sell on FlipFlop',
    description: 'Check the FlipFlop storefront projection and open the product page when it is available.',
    button: 'Sell on FlipFlop',
  },
];

export default function ChannelSalesPanel({ productId }: ChannelSalesPanelProps) {
  const [loading, setLoading] = useState<ChannelKey | null>(null);
  const [results, setResults] = useState<Record<ChannelKey, any>>({ allegro: null, flipflop: null });

  const runAction = async (channel: ChannelKey) => {
    setLoading(channel);
    try {
      const response = channel === 'allegro'
        ? await productsApi.sellOnAllegro(productId)
        : await productsApi.sellOnFlipFlop(productId);
      setResults((current) => ({ ...current, [channel]: response.data || response }));
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
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {CHANNELS.map((channel) => {
        const result = results[channel.key];
        const payload = result?.data || result;
        const listingUrl = payload?.listingUrl;
        const status = payload?.status || payload?.attempt?.status || (payload?.availableOnFlipFlop ? 'available' : null);
        const blocked = payload?.success === false || payload?.blocked;

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
                disabled={loading !== null}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === channel.key ? <LoadingSpinner size="sm" /> : channel.button}
              </button>
            </div>

            {payload && (
              <div className={`rounded-xl border p-4 text-sm ${blocked ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                <p className="font-semibold">
                  {blocked
                    ? payload.message || 'Channel action needs attention.'
                    : payload.message || 'Channel action prepared.'}
                </p>
                {status && <p className="mt-1">Status: {status}</p>}
                {listingUrl && (
                  <a
                    href={listingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex px-4 py-2 bg-white border border-green-300 rounded-lg font-semibold text-green-900 hover:bg-green-100"
                  >
                    Open listing
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
