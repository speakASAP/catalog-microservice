'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MarketplaceField, MarketplaceFieldsResponse, Product, productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface MarketplaceFieldsPanelProps {
  product: Product;
  onProductUpdated?: (product: Product) => void;
}

const MARKETPLACES = [
  { key: 'allegro', label: 'Allegro' },
  { key: 'bazos', label: 'Bazoš' },
  { key: 'aukro', label: 'Aukro' },
  { key: 'flipflop', label: 'FlipFlop' },
];

const stringifyJson = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
};

const parseValue = (field: MarketplaceField, value: string) => {
  if (field.type === 'number') return value.trim() ? Number(value) : null;
  if (field.type === 'boolean') return value === 'true';
  if (field.type === 'json') return value.trim() ? JSON.parse(value) : null;
  return value;
};

export default function MarketplaceFieldsPanel({ product, onProductUpdated }: MarketplaceFieldsPanelProps) {
  const [marketplace, setMarketplace] = useState('allegro');
  const [payload, setPayload] = useState<MarketplaceFieldsResponse | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [rawOverrides, setRawOverrides] = useState('{}');
  const [rawExternalRefs, setRawExternalRefs] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const loadFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const response = await productsApi.getMarketplaceFields(product.id, marketplace);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Marketplace fields are unavailable.');
      }
      setPayload(response.data);
      setFieldValues(
        response.data.fields.reduce((values, field) => ({
          ...values,
          [field.key]: stringifyJson(field.value),
        }), {} as Record<string, string>),
      );
      setRawOverrides(JSON.stringify(response.data.profile.overrides || {}, null, 2));
      setRawExternalRefs(JSON.stringify(response.data.profile.externalRefs || {}, null, 2));
    } catch (loadError) {
      setPayload(null);
      setError(loadError instanceof Error ? loadError.message : 'Marketplace fields are unavailable.');
    } finally {
      setLoading(false);
    }
  }, [marketplace, product.id]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  const canonicalFields = useMemo(
    () => payload?.fields.filter((field) => field.source === 'canonical') || [],
    [payload],
  );
  const marketplaceFields = useMemo(
    () => payload?.fields.filter((field) => field.source !== 'canonical') || [],
    [payload],
  );

  const saveFields = async () => {
    if (!payload) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const canonical: Record<string, unknown> = {};
      const overrides: Record<string, unknown> = JSON.parse(rawOverrides || '{}');
      const externalRefs: Record<string, unknown> = JSON.parse(rawExternalRefs || '{}');

      for (const field of payload.fields) {
        if (field.editable === false) continue;
        const value = parseValue(field, fieldValues[field.key] ?? '');
        if (field.source === 'canonical' && field.canonicalPath) {
          canonical[field.canonicalPath] = value;
        } else if (field.source === 'override') {
          overrides[field.key] = value;
        } else if (field.source === 'externalRef') {
          externalRefs[field.key] = value;
        }
      }

      const response = await productsApi.updateMarketplaceFields(product.id, marketplace, {
        canonical,
        overrides,
        externalRefs,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Marketplace fields were not saved.');
      }
      setPayload(response.data);
      if (response.data.product) {
        onProductUpdated?.({ ...product, ...response.data.product });
      }
      setSaved('Saved.');
      setRawOverrides(JSON.stringify(response.data.profile.overrides || {}, null, 2));
      setRawExternalRefs(JSON.stringify(response.data.profile.externalRefs || {}, null, 2));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Marketplace fields were not saved.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: MarketplaceField) => {
    const value = fieldValues[field.key] ?? '';
    const disabled = field.editable === false;
    const baseClass = 'w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500';

    return (
      <label key={`${field.source}-${field.key}`} className="space-y-2">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-700">
          {field.label}
          <span className={`rounded-full px-2 py-0.5 text-xs ${field.source === 'canonical' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
            {field.source === 'canonical' ? 'Catalog truth' : field.source}
          </span>
          {field.manualOverride && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800">
              Manual
            </span>
          )}
          {field.stale && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-900">
              Source changed
            </span>
          )}
        </span>
        {field.type === 'json' || field.key === 'description' ? (
          <textarea
            rows={field.type === 'json' ? 5 : 3}
            disabled={disabled}
            value={value}
            onChange={(event) => setFieldValues((current) => ({ ...current, [field.key]: event.target.value }))}
            className={baseClass}
          />
        ) : (
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            disabled={disabled}
            value={value}
            onChange={(event) => setFieldValues((current) => ({ ...current, [field.key]: event.target.value }))}
            className={baseClass}
          />
        )}
        {field.stale && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Canonical product data changed after this manual marketplace value was saved. Review this listing before publishing updates.
          </p>
        )}
        {field.aliases && field.aliases.length > 0 && (
          <p className="text-xs text-gray-500">Aliases: {field.aliases.join(', ')}</p>
        )}
      </label>
    );
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Marketplace fields</h2>
          <p className="text-sm text-gray-600">
            Catalog fields stay canonical; marketplace-only values are stored as profile overrides.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMarketplace(item.key)}
              className={`rounded-xl border px-4 py-2 text-sm font-bold ${marketplace === item.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
          <LoadingSpinner size="sm" />
        </div>
      ) : payload ? (
        <>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
            <p className="font-semibold">{payload.marketplace.label}</p>
            <p className="mt-1">{payload.marketplace.description}</p>
          </div>

          {payload.propagation?.status === 'manual_review_required' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">Canonical product source changed.</p>
              <p className="mt-1">
                Manual marketplace fields are preserved and will not be overwritten automatically. Review the marked fields before propagating this product to marketplace listings.
              </p>
              <p className="mt-2 text-xs font-semibold">
                Fields: {payload.propagation.staleManualFields.join(', ')}
              </p>
            </div>
          )}

          <details open className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-gray-900">Canonical aliases</summary>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {canonicalFields.map(renderField)}
            </div>
          </details>

          <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-gray-900">Additional marketplace fields</summary>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {marketplaceFields.map(renderField)}
            </div>
          </details>

          <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-gray-900">Raw profile JSON</summary>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700">Overrides</span>
                <textarea
                  rows={8}
                  value={rawOverrides}
                  onChange={(event) => setRawOverrides(event.target.value)}
                  className="w-full font-mono text-xs border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700">External refs</span>
                <textarea
                  rows={8}
                  value={rawExternalRefs}
                  onChange={(event) => setRawExternalRefs(event.target.value)}
                  className="w-full font-mono text-xs border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveFields}
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Save manual marketplace fields'}
            </button>
            {saved && <span className="text-sm font-semibold text-emerald-700">{saved}</span>}
          </div>
        </>
      ) : null}

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{error}</p>
        </div>
      )}
    </section>
  );
}
