'use client';

import { useEffect } from 'react';
import Link from 'next/link';

const DEFAULT_LOGIN_URL =
  'https://auth.alfares.cz/login?return_url=https%3A%2F%2Fcatalog.alfares.cz%2Fauth%2Fcallback&client_id=catalog&state=catalog-dashboard';

function buildHostedAuthUrl(mode: 'login' | 'register'): string {
  if (typeof window === 'undefined') return DEFAULT_LOGIN_URL;

  const authBase = process.env.NEXT_PUBLIC_HOSTED_AUTH_URL || 'https://auth.alfares.cz';
  const returnUrl = `${window.location.origin}/auth/callback`;
  const url = new URL(mode === 'register' ? '/register' : '/login', authBase);
  url.searchParams.set('return_url', returnUrl);
  url.searchParams.set('client_id', 'catalog');
  url.searchParams.set('state', 'catalog-dashboard');
  return url.toString();
}

export default function LoginPage() {
  useEffect(() => {
    window.location.replace(buildHostedAuthUrl('login'));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-950">Redirecting to Alfares Auth</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Catalog uses the shared auth-microservice sign-in window.
        </p>
        <Link href={DEFAULT_LOGIN_URL} className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">
          Continue to sign in
        </Link>
      </div>
    </main>
  );
}
