'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, AdminUserListItem } from '@/lib/api/auth';

export default function InternalAdminPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      setLoading(true);
      setError(null);
      const response = await authApi.listAdminUsers({ limit: 100, offset: 0 });
      if (response.success && response.data) {
        setAccounts(response.data.users);
        setTotal(response.data.count);
      } else {
        setError(response.error || 'Unable to load registered accounts');
      }
      setLoading(false);
    };

    loadAccounts();
  }, []);

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <p className="text-xs font-semibold uppercase text-blue-700">Internal admin</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Catalog accounts</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Auth remains the identity owner. Catalog shows the registered account directory here for the approved admin account only.
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Current admin session</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-xs font-semibold uppercase text-gray-500">User</dt>
              <dd className="mt-1 text-sm font-bold text-gray-900">{user?.email}</dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-xs font-semibold uppercase text-gray-500">Access</dt>
              <dd className="mt-1 text-sm text-gray-700">Catalog admin section</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">Product quality</p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">Review queue</h2>
              <p className="mt-1 text-sm text-gray-600">
                Mandatory blockers, optional opportunities, report exports, bulk updates, and activation gates.
              </p>
            </div>
            <Link
              href="/dashboard/admin/product-review"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Open review
            </Link>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Registered accounts</h2>
              <p className="mt-1 text-sm text-gray-500">Showing {accounts.length} of {total.toLocaleString('en-US')} accounts</p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {accounts.map((account) => (
                    <tr key={account.id} className={account.email === user?.email ? 'bg-blue-50/60' : undefined}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{account.email}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {[account.firstName, account.lastName].filter(Boolean).join(' ') || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {account.isActive ? 'Active' : 'Inactive'} / {account.isVerified ? 'Verified' : 'Unverified'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{account.userType || 'user'}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {account.createdAt ? new Date(account.createdAt).toLocaleDateString('cs-CZ') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
