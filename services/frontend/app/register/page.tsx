'use client';

import { useEffect } from 'react';
import Link from 'next/link';

const DEFAULT_REGISTER_URL =
  'https://auth.alfares.cz/register?return_url=https%3A%2F%2Fcatalog.alfares.cz%2Fauth%2Fcallback&client_id=catalog-microservice&state=catalog-auth';

const AUTH_STATE_KEY = 'catalog_auth_state';
const CLIENT_ID = 'catalog-microservice';

function createAuthState(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `catalog-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildHostedAuthUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_REGISTER_URL;

  const authBase = process.env.NEXT_PUBLIC_HOSTED_AUTH_URL || 'https://auth.alfares.cz';
  const returnUrl = `${window.location.origin}/auth/callback`;
  const state = createAuthState();
  const url = new URL('/register', authBase);
  url.searchParams.set('return_url', returnUrl);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('state', state);
  window.sessionStorage.setItem(AUTH_STATE_KEY, state);
  return url.toString();
}

export default function RegisterPage() {
  useEffect(() => {
    window.location.replace(buildHostedAuthUrl());
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-950">Redirecting to Alfares Auth</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Registration is handled by the shared auth-microservice account window.
        </p>
        <Link href={DEFAULT_REGISTER_URL} className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">
          Continue to register
        </Link>
      </div>
    </main>
  );
}
