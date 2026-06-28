'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AukroAccountStatus, AukroDraftStatus, productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface AukroPublishPanelProps {
  productId: string;
}

const statusLabels: Record<string, string> = {
  ready_for_review: 'Ready for review',
  blocked: 'Blocked by policy',
};

const formatAccountName = (account?: AukroAccountStatus['selectedAccount']) => {
  if (!account) return 'No account selected';
  return account.accountName || account.username || account.id;
};

export default function AukroPublishPanel({ productId }: AukroPublishPanelProps) {
  const [accountStatus, setAccountStatus] = useState<AukroAccountStatus | null>(null);
  const [draftStatus, setDraftStatus] = useState<AukroDraftStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [preparingDraft, setPreparingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accountStatus?.selectedAccount || draftStatus?.account || null;
  const blockers = useMemo(() => draftStatus?.blockers || draftStatus?.requiresHumanAction?.policyFailures || [], [draftStatus]);
  const draftState = draftStatus?.draftStatus || draftStatus?.draft?.draftStatus || null;
  const offerId = draftStatus?.offerId || draftStatus?.offer?.id || null;
  const isReady = draftState === 'ready_for_review';
  const isBlocked = draftState === 'blocked' || blockers.length > 0 || draftStatus?.blocked;

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const [accountResponse, statusResponse] = await Promise.all([
        productsApi.getAukroAccountStatus(),
        productsApi.getAukroStatus(productId),
      ]);

      if (accountResponse.success && accountResponse.data) {
        setAccountStatus(accountResponse.data);
      } else {
        setAccountStatus(null);
      }

      if (statusResponse.success && statusResponse.data) {
        setDraftStatus(statusResponse.data);
      } else {
        setDraftStatus(null);
        setError(statusResponse.error?.message || accountResponse.error?.message || 'Aukro draft status is unavailable.');
      }
    } catch (statusError) {
      console.error('Failed to load Aukro draft status:', statusError);
      setDraftStatus(null);
      setError('Aukro draft status is unavailable.');
    } finally {
      setLoadingStatus(false);
    }
  }, [productId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const prepareDraft = useCallback(async () => {
    setPreparingDraft(true);
    setError(null);
    try {
      const response = await productsApi.sellOnAukro(productId, {
        accountId: selectedAccount?.id,
        requestedBy: 'catalog-dashboard',
      });
      if (response.success && response.data) {
        setDraftStatus(response.data);
      } else {
        setError(response.error?.message || 'Aukro draft preparation failed.');
      }
    } catch (draftError) {
      console.error('Failed to prepare Aukro draft:', draftError);
      setError('Aukro draft preparation failed.');
    } finally {
      setPreparingDraft(false);
    }
  }, [productId, selectedAccount?.id]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Sell on Aukro</h3>
          <p className="text-sm text-gray-600 mt-1">
            Prepare or reuse a local Aukro draft from this catalog product. Aukro owns marketplace account readiness, policy blockers and final publish approval.
          </p>
        </div>
        <button
          type="button"
          onClick={prepareDraft}
          disabled={loadingStatus || preparingDraft || !accountStatus?.canSell || isReady}
          className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {preparingDraft ? <LoadingSpinner size="sm" /> : isReady ? 'Draft ready' : 'Prepare Aukro draft'}
        </button>
      </div>

      {loadingStatus ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <div className="flex items-center gap-3"><LoadingSpinner size="sm" /> Checking Aukro draft status...</div>
        </div>
      ) : !accountStatus?.canSell ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Aukro account is not ready.</p>
          <p className="mt-1">{accountStatus?.message || 'Connect an Aukro account before preparing a catalog draft.'}</p>
          {accountStatus?.dependencyMessage && <p className="mt-1">Dependency: {accountStatus.dependencyMessage}</p>}
        </div>
      ) : offerId ? (
        <div className={`rounded-xl border p-4 text-sm ${isBlocked ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-green-200 bg-green-50 text-green-900'}`}>
          <p className="font-semibold">
            {isBlocked ? 'Aukro draft needs attention before review.' : 'Aukro draft is prepared for this product.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-white px-3 py-1 font-semibold border border-current/20">
              Status: {draftState ? statusLabels[draftState] || draftState : 'Draft saved'}
            </span>
            <span className="rounded-lg bg-white px-3 py-1 font-semibold border border-current/20">
              Account: {formatAccountName(selectedAccount)}
            </span>
          </div>
          <label className="mt-3 block space-y-2">
            <span className="text-xs font-semibold uppercase">Aukro offer record</span>
            <input
              type="text"
              readOnly
              value={offerId}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full rounded-lg border border-current/20 bg-white px-3 py-2 font-mono text-xs text-gray-950"
            />
          </label>
          {blockers.length > 0 && (
            <div className="mt-3">
              <p className="font-semibold">Policy blockers</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">This product can be prepared for Aukro.</p>
          <p className="mt-1">Account: {formatAccountName(selectedAccount)}. The next step creates a local Aukro draft and runs policy readiness gates.</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{error}</p>
          <p className="mt-1">Retry after resolving the Aukro-owned dependency or signing in again.</p>
        </div>
      )}
    </div>
  );
}
