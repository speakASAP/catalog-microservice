'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BazosAccountStatus, BazosListingStatus, BazosSellActionResponse, productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface BazosPublishPanelProps {
  productId: string;
  defaultCategory?: string;
}

const BAZOS_CATEGORIES = [
  'Auto',
  'Motorky',
  'Dum a zahrada',
  'Elektro',
  'Nabytek',
  'Obleceni',
  'Sport',
  'Detske zbozi',
  'Zvirata',
  'Ostatni',
];

const LOCATIONS = [
  'Praha',
  'Brno',
  'Ostrava',
  'Plzen',
  'Liberec',
  'Olomouc',
  'Ceske Budejovice',
  'Hradec Kralove',
  'Pardubice',
  'Zlin',
];

const statusClass = (status?: BazosAccountStatus | null) => {
  if (!status) return 'bg-gray-50 border-gray-200 text-gray-700';
  if (status.canSell) return 'bg-emerald-50 border-emerald-200 text-emerald-900';
  return 'bg-amber-50 border-amber-200 text-amber-900';
};

export default function BazosPublishPanel({ productId, defaultCategory }: BazosPublishPanelProps) {
  const [accountStatus, setAccountStatus] = useState<BazosAccountStatus | null>(null);
  const [listingStatus, setListingStatus] = useState<BazosListingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [selectedIdentityId, setSelectedIdentityId] = useState('');
  const [category, setCategory] = useState(defaultCategory || BAZOS_CATEGORIES[3]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BazosSellActionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const [accountResponse, listingResponse] = await Promise.all([
        productsApi.getBazosAccountStatus(),
        productsApi.getBazosStatus(productId),
      ]);

      if (accountResponse.success && accountResponse.data) {
        setAccountStatus(accountResponse.data);
        setSelectedIdentityId(accountResponse.data.selectedIdentity?.id || '');
        setLocation(accountResponse.data.selectedIdentity?.defaultLocation || LOCATIONS[0]);
      } else {
        setAccountStatus(null);
        setError(accountResponse.error?.message || 'Bazos account status is unavailable.');
      }

      setListingStatus(listingResponse.success && listingResponse.data ? listingResponse.data : null);
    } finally {
      setLoadingStatus(false);
    }
  }, [productId]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    if (defaultCategory) setCategory(defaultCategory);
  }, [defaultCategory]);

  const selectedIdentity = useMemo(
    () => accountStatus?.identities.find((identity) => identity.id === selectedIdentityId) || accountStatus?.selectedIdentity || null,
    [accountStatus, selectedIdentityId],
  );
  const canSubmit = Boolean(accountStatus?.canSell && selectedIdentity?.canSell && selectedIdentityId && category.trim());
  const publishedOnBasus = Boolean(listingStatus?.publishedOnBasus || listingStatus?.draft?.publishedOnBasus);
  const listingUrl = listingStatus?.listingUrl || listingStatus?.draft?.listingUrl;
  const publishStatus = listingStatus?.draft?.publishStatus;

  const handleSell = async () => {
    if (!canSubmit) {
      setError(accountStatus?.message || 'Connect and verify Bazos before publishing this product.');
      return;
    }

    setSubmitting(true);
    setResult(null);
    setError(null);
    try {
      const response = await productsApi.sellOnBazos(productId, {
        identityId: selectedIdentityId,
        category,
        location,
        useCallerBazosIdentity: true,
      });
      if (response.success && response.data) {
        setResult(response.data);
        await loadStatuses();
      } else {
        setError(response.error?.message || 'Bazos draft request failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const blockedReasons = selectedIdentity?.blockingReasons || [];
  const policyFailures = result?.requiresHumanAction?.policyFailures || result?.policyStatus?.failures || [];
  const draftCreated = Boolean(result?.draft?.id);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Sell on Bazos</h3>
          <p className="text-sm text-gray-600 mt-1">
            Bazos owns account verification, policy checks and publishing. Catalog can prepare a Bazos draft for this product.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSell}
          disabled={loadingStatus || submitting || !canSubmit}
          className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <LoadingSpinner size="sm" /> : 'Publish on Bazos'}
        </button>
      </div>

      {loadingStatus ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Checking Bazos listing status...
        </div>
      ) : publishedOnBasus ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">This product is already listed on Bazos.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-white px-3 py-1 font-semibold text-green-800 border border-green-200">
              Status: {publishStatus || 'published'}
            </span>
            {listingUrl && (
              <a
                href={listingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-4 py-2 bg-white border border-green-300 rounded-lg font-semibold text-green-900 hover:bg-green-100"
              >
                Open Bazos listing
              </a>
            )}
          </div>
        </div>
      ) : publishStatus ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Bazos draft exists for this product.</p>
          <p className="mt-1">Status: {publishStatus}</p>
        </div>
      ) : null}

      <div className={`rounded-xl border p-4 text-sm ${statusClass(accountStatus)}`}>
        {loadingStatus ? (
          <div className="flex items-center gap-3"><LoadingSpinner size="sm" /> Checking Bazos account...</div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold">
              {accountStatus?.canSell ? 'Bazos account is connected and ready.' : accountStatus?.message || error || 'Bazos account is not ready.'}
            </p>
            {!accountStatus?.canSell && (
              <p>
                Connect and verify a Bazos phone identity in Bazos settings before publishing. If Bazos asks for phone, SMS, bank, payment or manual challenge verification, complete it in Bazos first.
              </p>
            )}
            {blockedReasons.length > 0 && (
              <ul className="list-disc pl-5">
                {blockedReasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-semibold text-gray-700">Bazos identity</span>
          <select
            value={selectedIdentityId}
            onChange={(event) => setSelectedIdentityId(event.target.value)}
            disabled={!accountStatus?.identities.length}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 bg-white disabled:bg-gray-100"
          >
            {!accountStatus?.identities.length && <option value="">No connected identity</option>}
            {accountStatus?.identities.map((identity) => (
              <option key={identity.id} value={identity.id}>
                {identity.displayName || identity.contactName || identity.id} - {identity.canSell ? 'ready' : identity.status || 'blocked'}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Bazos category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 bg-white"
          >
            {BAZOS_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Location</span>
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 bg-white"
          >
            {LOCATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {(error || result) && (
        <div className={`rounded-xl border p-4 text-sm ${draftCreated ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <div className="space-y-2">
            <p className="font-semibold">
              {draftCreated
                ? 'Bazos draft is ready for Bazos-owned confirmation.'
                : error || result?.message || 'Bazos publishing needs one more step.'}
            </p>
            {result?.requiresConfirmation && (
              <p>Review and confirm the draft in the Bazos workflow before it can be queued for publication.</p>
            )}
            {policyFailures.length > 0 && (
              <ul className="list-disc pl-5">
                {policyFailures.map((failure: any) => (
                  <li key={failure.gate || failure.code}>{failure.message || failure.gate || failure.code}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
