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

const CATALOG_ADMIN_ROLES = new Set([
  'global:superadmin',
  'app:catalog-microservice:admin',
  'internal:catalog-microservice:admin',
  'catalog:write',
]);

function hasCatalogAdminRole(roles?: string[]): boolean {
  return Array.isArray(roles) && roles.some((role) => CATALOG_ADMIN_ROLES.has(role));
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { loading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const canAccessAdmin = hasCatalogAdminRole(user?.roles);

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
          <h1 className="text-lg font-semibold text-gray-900">Admin access required</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your Auth account does not include a Catalog admin role.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Back to catalog
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
