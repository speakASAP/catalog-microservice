'use client';

import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';

export default function InternalAdminPage() {
  const { user } = useAuth();

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Internal admin</p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-900">Catalog account administration</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            This section is reserved for users with a Catalog admin role. The customer dashboard remains available to every authenticated catalog user.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Current admin session</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-xs font-semibold uppercase text-gray-500">User</dt>
              <dd className="mt-1 text-sm font-bold text-gray-900">{user?.email}</dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-xs font-semibold uppercase text-gray-500">Roles</dt>
              <dd className="mt-1 text-sm text-gray-700">{user?.roles?.join(', ') || 'No roles reported'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-gray-600">
            Account directory controls will be connected here when the Auth user-directory API is available to Catalog.
          </p>
        </div>
      </div>
    </AdminGuard>
  );
}
