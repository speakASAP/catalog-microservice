'use client';

/**
 * Admin Guard Component
 * Protects admin routes with Auth RBAC roles before rendering admin surfaces.
 */

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authSessionKeys } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import LoadingSpinner from './LoadingSpinner';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Roles that may reach the catalog admin surface. Mirrors
 * CatalogAuthGuard.WRITE_ROLES on the backend, which is what actually enforces
 * access — this list only decides whether the UI renders, so the two must agree
 * or a user is shown a page every request then 403s.
 *
 * Previously a single hardcoded email, which tied admin access to one shared
 * account and made granting or revoking it a redeploy.
 */
export const CATALOG_ADMIN_ROLES = [
  'global:superadmin',
  'global:platform_admin',
  'app:catalog-microservice:admin',
  'internal:catalog-microservice:admin',
  'catalog:write',
];

export function hasCatalogAdminAccess(roles?: string[] | null): boolean {
  return (roles ?? []).some((role) => CATALOG_ADMIN_ROLES.includes(role));
}

/**
 * Roles as claimed by the access token.
 *
 * `/auth/profile` returns the user row, and roles live in a separate table, so
 * the profile response carries no `roles` field. The access token does — auth
 * embeds them when it signs (auth-microservice src/auth/auth.service.ts:646),
 * which is the same claim every backend guard authorizes on.
 *
 * This only decides whether the UI renders. CatalogAuthGuard re-validates the
 * token server-side, so a tampered payload buys nothing but a 403 one call later.
 */
export function rolesFromAccessToken(token?: string | null): string[] {
  if (!token) return [];
  try {
    const payload = token.split('.')[1];
    if (!payload) return [];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as { roles?: unknown };
    return Array.isArray(claims.roles) ? claims.roles.map(String) : [];
  } catch {
    return [];
  }
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { loading, isAuthenticated, isLoggingOut, user } = useAuth();
  const router = useRouter();
  const canAccessAdmin = hasCatalogAdminAccess(user?.roles?.length ? user.roles : rolesFromAccessToken(apiClient.getToken()));

  useEffect(() => {
    if (loading || isAuthenticated) return;

    const shouldReturnHome =
      isLoggingOut || window.sessionStorage.getItem(authSessionKeys.logoutRedirect) === '1';

    if (shouldReturnHome) {
      window.sessionStorage.removeItem(authSessionKeys.logoutRedirect);
      router.replace('/');
      return;
    }

    router.push('/login');
  }, [loading, isAuthenticated, isLoggingOut, router]);

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
            Your Auth account can use the Catalog dashboard, but it does not carry a Catalog admin role.
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
