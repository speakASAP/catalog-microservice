'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { apiClient } from '@/lib/api/client';

function readTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

export default function AuthCallbackPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const token = readTokenFromHash();
    if (!token) {
      setError('Auth response did not include an access token.');
      return;
    }

    apiClient.setToken(token);
    window.history.replaceState(null, '', '/auth/callback');
    window.location.replace('/admin');
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-950">Sign-in could not be completed</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
          <Link href="/login" className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">
            Try again
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <LoadingSpinner size="lg" />
    </main>
  );
}
