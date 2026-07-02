'use client';

import { useEffect, useState } from 'react';
import { CatalogSourceSettings, productsApi } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function CatalogSettingsPage() {
  const [settings, setSettings] = useState<CatalogSourceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    productsApi.provisionCatalogAccess('catalog').then((response) => {
      if (!mounted) return;
      if (response.success && response.data) {
        setSettings(response.data);
      }
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const updateSetting = async (field: 'includeAlfaresCatalog' | 'includeCommunityCatalog', value: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await productsApi.updateCatalogSettings({ [field]: value });
      if (response.success && response.data) {
        setSettings(response.data);
        setMessage('Settings saved.');
      } else {
        setMessage(response.error?.message || 'Settings could not be saved.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 p-8 text-white shadow-xl">
        <h1 className="text-3xl font-extrabold">Catalog settings</h1>
        <p className="mt-2 text-blue-50">Choose product sources for your seller catalog.</p>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-extrabold text-gray-900">Product sources</h2>
        <div className="mt-5 space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input
              type="checkbox"
              checked={settings?.includeAlfaresCatalog === true}
              disabled={saving || !settings}
              onChange={(event) => updateSetting('includeAlfaresCatalog', event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block font-bold text-gray-900">Alfares products</span>
              <span className="block text-sm text-gray-600">Products owned by Alfares and available through the platform.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input
              type="checkbox"
              checked={settings?.includeCommunityCatalog === true}
              disabled={saving || !settings}
              onChange={(event) => updateSetting('includeCommunityCatalog', event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span className="block font-bold text-gray-900">Other sellers</span>
              <span className="block text-sm text-gray-600">Products that another seller explicitly marked as available for resale.</span>
            </span>
          </label>
        </div>
        {message && <p className="mt-4 text-sm font-semibold text-gray-700">{message}</p>}
      </section>
    </div>
  );
}
