'use client';

/**
 * Admin Guard Component
 * Protects admin routes with Auth RBAC roles before rendering admin surfaces.
 */

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface AdminGuardProps {
  children: ReactNode;
}

export const CATALOG_ADMIN_EMAIL = 'test@example.com';

export function hasCatalogAdminAccess(email?: string | null): boolean {
  return email?.trim().toLowerCase() === CATALOG_ADMIN_EMAIL;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { loading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const canAccessAdmin = hasCatalogAdminAccess(user?.email);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!canAccessAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Admin section access required</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your Auth account can use the Catalog dashboard, but it is not the approved Catalog admin account.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
