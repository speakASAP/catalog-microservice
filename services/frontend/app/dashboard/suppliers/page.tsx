'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import DashboardPageShell from '@/components/DashboardPageShell';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CreateSupplierPayload, Supplier, SupplierApiType, suppliersApi } from '@/lib/api/suppliers';

const apiTypeOptions: SupplierApiType[] = ['rest', 'csv', 'xml', 'ftp'];

const buildSupplierCode = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100);

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [apiType, setApiType] = useState<SupplierApiType>('rest');
  const [apiUrl, setApiUrl] = useState('');

  const activeCount = useMemo(() => suppliers.filter((supplier) => supplier.isActive).length, [suppliers]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    const response = await suppliersApi.list();
    if (response.success && response.data) {
      setSuppliers(response.data);
    } else {
      setError(response.error?.message || 'Suppliers are unavailable.');
    }
    setLoading(false);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!code) setCode(buildSupplierCode(value));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);

    const payload: CreateSupplierPayload = {
      name: name.trim(),
      code: buildSupplierCode(code),
      apiType,
      isActive: true,
    };
    const trimmedUrl = apiUrl.trim();
    if (trimmedUrl) payload.apiUrl = trimmedUrl;

    const response = await suppliersApi.create(payload);
    if (response.success && response.data) {
      setSuppliers((current) => [response.data as Supplier, ...current]);
      setName('');
      setCode('');
      setApiUrl('');
      setApiType('rest');
      setStatus('Supplier created and linked to your account.');
    } else {
      setError(response.error?.message || 'Supplier could not be created.');
    }
    setSaving(false);
  };

  return (
    <DashboardPageShell
      icon="🏭"
      title="Suppliers"
      subtitle="Create supplier records for your account and use them to filter catalog stock."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">New supplier</h2>
            <p className="mt-1 text-sm text-gray-600">The supplier is saved under the current logged-in account.</p>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-gray-700">Name</span>
            <input
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              required
              maxLength={200}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Supplier company name"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-gray-700">Code</span>
            <input
              value={code}
              onChange={(event) => setCode(buildSupplierCode(event.target.value))}
              required
              maxLength={100}
              pattern="[A-Za-z0-9_-]+"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="supplier-code"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-gray-700">API type</span>
              <select
                value={apiType}
                onChange={(event) => setApiType(event.target.value as SupplierApiType)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {apiTypeOptions.map((option) => <option key={option} value={option}>{option.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-gray-700">API URL</span>
              <input
                value={apiUrl}
                onChange={(event) => setApiUrl(event.target.value)}
                type="url"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="https://supplier.example/api"
              />
            </label>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
          {status && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{status}</div>}

          <button
            type="submit"
            disabled={saving || !name.trim() || !buildSupplierCode(code)}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? 'Creating supplier...' : 'Create supplier'}
          </button>
        </form>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Your suppliers</h2>
              <p className="mt-1 text-sm text-gray-600">{suppliers.length} suppliers, {activeCount} active.</p>
            </div>
            <button
              type="button"
              onClick={loadSuppliers}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : suppliers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-extrabold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-blue-50/40">
                      <td className="max-w-[240px] px-4 py-3">
                        <div className="truncate font-extrabold text-gray-900" title={supplier.name}>{supplier.name}</div>
                        <div className="truncate text-xs text-gray-500" title={supplier.id}>{supplier.id}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{supplier.code}</td>
                      <td className="px-4 py-3 text-gray-700">{supplier.apiType.toUpperCase()}</td>
                      <td className="max-w-[220px] px-4 py-3 truncate text-gray-700" title={supplier.ownerEmail || ''}>{supplier.ownerEmail || 'Current account'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <h2 className="text-xl font-extrabold text-gray-900">No suppliers yet</h2>
              <p className="mt-2 text-sm text-gray-600">Create the first supplier for this account.</p>
            </div>
          )}
        </section>
      </div>
    </DashboardPageShell>
  );
}
