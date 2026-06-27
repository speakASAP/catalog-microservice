'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AllegroSellActionResponse, productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface AllegroPublishPanelProps {
  productId: string;
  defaultTitle?: string;
  defaultDescription?: string;
}

const unwrapResult = (result: any): AllegroSellActionResponse | null => result?.data || result || null;
const statusLabel = (status?: string | null) => status || 'not prepared';

export default function AllegroPublishPanel({ productId, defaultTitle = '', defaultDescription = '' }: AllegroPublishPanelProps) {
  const [status, setStatus] = useState<AllegroSellActionResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftForm, setDraftForm] = useState({ title: defaultTitle, description: defaultDescription, price: '', quantity: '1' });

  const draft = status?.draft || null;
  const attempt = status?.attempt || null;
  const listingUrl = status?.listingUrl || null;
  const canConfirm = Boolean(status?.canConfirmPublish || status?.requiresConfirmation || status?.nextAction === 'confirm_publish');
  const canEdit = Boolean(draft?.id && status?.canEditDraft !== false);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const response = await productsApi.getAllegroStatus(productId);
      const payload = unwrapResult(response);
      setStatus(payload);
      if (payload?.draft) {
        setDraftForm({
          title: payload.draft.title || defaultTitle,
          description: payload.draft.description || defaultDescription,
          price: payload.draft.price != null ? String(payload.draft.price) : '',
          quantity: payload.draft.quantity != null ? String(payload.draft.quantity) : '1',
        });
      }
    } catch (statusError) {
      console.error('Failed to load Allegro status:', statusError);
      setStatus(null);
      setError('Allegro offer status is unavailable.');
    } finally {
      setLoadingStatus(false);
    }
  }, [defaultDescription, defaultTitle, productId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const prepareDraft = async () => {
    setPreparing(true);
    setError(null);
    try {
      const response = await productsApi.sellOnAllegro(productId, {
        title: draftForm.title || undefined,
        description: draftForm.description || undefined,
        price: draftForm.price ? Number(draftForm.price) : undefined,
        quantity: draftForm.quantity ? Number(draftForm.quantity) : undefined,
      });
      setStatus(unwrapResult(response));
    } catch (prepareError) {
      console.error('Failed to prepare Allegro draft:', prepareError);
      setError('Allegro draft preparation failed.');
    } finally {
      setPreparing(false);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await productsApi.updateAllegroDraft(productId, {
        offerId: draft?.id,
        title: draftForm.title || undefined,
        description: draftForm.description || undefined,
        price: draftForm.price ? Number(draftForm.price) : undefined,
        quantity: draftForm.quantity ? Number(draftForm.quantity) : undefined,
      });
      setStatus(unwrapResult(response));
    } catch (saveError) {
      console.error('Failed to update Allegro draft:', saveError);
      setError('Allegro draft update failed.');
    } finally {
      setSaving(false);
    }
  };

  const confirmPublish = async () => {
    setConfirming(true);
    setError(null);
    try {
      const response = await productsApi.confirmAllegroPublish(productId);
      setStatus(unwrapResult(response));
    } catch (confirmError) {
      console.error('Failed to confirm Allegro publish:', confirmError);
      setError('Allegro publish confirmation failed.');
    } finally {
      setConfirming(false);
    }
  };

  const stateMessage = useMemo(() => {
    if (status?.blocked || status?.success === false) return status.message || 'Allegro action needs attention.';
    if (listingUrl) return 'This product has an Allegro listing.';
    if (attempt?.id) return 'Allegro draft is prepared through the governed publish lifecycle.';
    if (draft?.id) return 'Allegro draft exists and can be edited before publishing.';
    return 'Prepare an Allegro draft from this catalog product.';
  }, [attempt?.id, draft?.id, listingUrl, status]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Sell on Allegro</h3>
          <p className="text-sm text-gray-600 mt-1">
            Allegro owns marketplace compliance, account state, draft presentation and guarded publishing.
          </p>
        </div>
        <button
          type="button"
          onClick={prepareDraft}
          disabled={preparing || saving || confirming}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {preparing ? <LoadingSpinner size="sm" /> : draft?.id ? 'Refresh draft' : 'Prepare on Allegro'}
        </button>
      </div>

      {loadingStatus ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <div className="flex items-center gap-3"><LoadingSpinner size="sm" /> Checking Allegro offer status...</div>
        </div>
      ) : (
        <div className={`rounded-xl border p-4 text-sm ${status?.blocked || status?.success === false ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
          <p className="font-semibold">{stateMessage}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-white px-3 py-1 font-semibold border border-blue-200 text-blue-900">
              Status: {statusLabel(status?.status || attempt?.status || draft?.publicationStatus)}
            </span>
            {status?.nextAction && (
              <span className="rounded-lg bg-white px-3 py-1 font-semibold border border-blue-200 text-blue-900">
                Next: {status.nextAction}
              </span>
            )}
          </div>
          {listingUrl && (
            <a href={listingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex px-4 py-2 bg-white border border-blue-300 rounded-lg font-semibold text-blue-900 hover:bg-blue-100">
              Open listing
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Allegro title</span>
          <input
            type="text"
            value={draftForm.title}
            onChange={(event) => setDraftForm((current) => ({ ...current, title: event.target.value }))}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draftForm.price}
              onChange={(event) => setDraftForm((current) => ({ ...current, price: event.target.value }))}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Quantity</span>
            <input
              type="number"
              min="0"
              step="1"
              value={draftForm.quantity}
              onChange={(event) => setDraftForm((current) => ({ ...current, quantity: event.target.value }))}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>
        <label className="md:col-span-2 space-y-2">
          <span className="text-sm font-semibold text-gray-700">Allegro description</span>
          <textarea
            value={draftForm.description}
            onChange={(event) => setDraftForm((current) => ({ ...current, description: event.target.value }))}
            rows={4}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveDraft}
          disabled={!canEdit || saving || preparing || confirming}
          className="px-5 py-2.5 bg-white border border-blue-300 text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <LoadingSpinner size="sm" /> : 'Save Allegro draft'}
        </button>
        <button
          type="button"
          onClick={confirmPublish}
          disabled={!canConfirm || saving || preparing || confirming}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirming ? <LoadingSpinner size="sm" /> : 'Confirm publish'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{error}</p>
          <p className="mt-1">Check Allegro account, category mapping, draft readiness and publish lifecycle status.</p>
        </div>
      )}
    </div>
  );
}
