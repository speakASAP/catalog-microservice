'use client';

import { useState } from 'react';
import { productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface BazosPublishPanelProps {
  productId: string;
}

export default function BazosPublishPanel({ productId }: BazosPublishPanelProps) {
  const [accountId, setAccountId] = useState('');
  const [identityId, setIdentityId] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSell = async () => {
    if (!accountId.trim()) {
      setResult({ success: false, message: 'Bazos accountId is required.' });
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const response = await productsApi.sellOnBazos(productId, {
        accountId: accountId.trim(),
        identityId: identityId.trim() || undefined,
        category: category.trim() || undefined,
        location: location.trim() || undefined,
      });
      setResult(response.data || response);
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : 'Failed to send to Bazos.' });
    } finally {
      setSubmitting(false);
    }
  };

  const queue = result?.queue?.data || result?.queue;
  const queued = queue?.queued === true;
  const blockedReasons = queue?.decision?.reasons || result?.data?.queue?.decision?.reasons || [];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Sell on Bazos</h3>
          <p className="text-sm text-gray-600 mt-1">Creates a Bazos offer and queues it through the compliance gate.</p>
        </div>
        <button
          type="button"
          onClick={handleSell}
          disabled={submitting || !accountId.trim()}
          className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <LoadingSpinner size="sm" /> : 'Sell on Bazos'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          placeholder="Bazos accountId"
          className="border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
        />
        <input
          value={identityId}
          onChange={(event) => setIdentityId(event.target.value)}
          placeholder="Verified identityId"
          className="border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
        />
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Bazos category"
          className="border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
        />
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
          className="border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
        />
      </div>

      {result && (
        <div className={`rounded-xl border p-4 text-sm ${queued ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {queued ? (
            <p className="font-semibold">Queued for compliant Bazos publishing.</p>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold">{result.message || 'Bazos publishing was not queued.'}</p>
              {blockedReasons.length > 0 && (
                <ul className="list-disc pl-5">
                  {blockedReasons.map((reason: any) => (
                    <li key={reason.code}>{reason.message || reason.code}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
