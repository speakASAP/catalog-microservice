'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authSessionKeys } from '@/lib/api/auth';
import LoadingSpinner from './LoadingSpinner';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { loading, isAuthenticated, isLoggingOut } = useAuth();
  const router = useRouter();

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

  return <>{children}</>;
}
