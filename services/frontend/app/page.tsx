'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const benefits = [
  {
    title: 'One product truth',
    text: 'Keep product names, descriptions, SKU, EAN, media, categories, attributes, and lifecycle state in one controlled catalog.',
  },
  {
    title: 'Channel-ready data',
    text: 'Prepare products for downstream channels with readiness checks for categories, descriptions, media, price, and warehouse coverage.',
  },
  {
    title: 'Price control',
    text: 'Manage current and future prices with validity windows, sale prices, cost visibility, and margin tracking from the customer dashboard.',
  },
  {
    title: 'Central Auth access',
    text: 'Use Alfares hosted authentication and role-based access so admin tools are available only to approved catalog operators.',
  },
];

const workflow = ['Register in Alfares Auth', 'Get catalog access', 'Choose sellable sources', 'Sell through connected channels'];

const salesSources = [
  {
    title: 'Alfares supplier catalog',
    text: 'Add company-approved supplier products with discounted buying conditions to your sales channels without sourcing inventory first.',
  },
  {
    title: 'Your private catalog',
    text: 'List products you own, control their content and price, and publish them to supported Alfares marketplace services.',
  },
  {
    title: 'Community resale pool',
    text: 'Opt in to products other sellers make available for resale, then offer them through Alfares channels or your own connected storefronts.',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="text-lg font-extrabold tracking-normal text-slate-950">
            Alfares Catalog
          </Link>
          <nav className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/register" className="hidden text-slate-600 transition-colors hover:text-slate-950 sm:inline">
              Register
            </Link>
            <Link
              href={isAuthenticated ? '/dashboard' : '/login'}
              className="rounded-md bg-slate-950 px-4 py-2 text-white transition-colors hover:bg-slate-800"
            >
              {isAuthenticated ? 'Open dashboard' : 'Sign in'}
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#eff6ff_100%)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-normal text-slate-950 md:text-6xl">
              Product catalog for controlled selling across Alfares services
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Register your account, get approved catalog access, and manage the products you sell from three sources: your own catalog, Alfares supplier offers, and community resale products that other sellers open for distribution.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:border-slate-950"
              >
                Sign in to dashboard
              </Link>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-5 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" />
            <div className="rounded-md bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-sm font-bold text-slate-950">Catalog workspace</p>
                  <p className="text-xs text-slate-500">Products, prices, readiness</p>
                </div>
                <div className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Auth protected</div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ['P-1024', 'Industrial shelf unit', 'Ready', '2 490 CZK'],
                  ['P-1041', 'Warehouse transport box', 'Needs media', '349 CZK'],
                  ['P-1088', 'Service tool kit', 'Ready', '1 190 CZK'],
                ].map(([sku, title, status, price]) => (
                  <div key={sku} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs font-bold text-slate-500">{sku}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-950">{title}</p>
                      <p className="text-xs text-slate-500">{status}</p>
                    </div>
                    <span className="text-sm font-extrabold text-slate-950">{price}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-white">
              {['Products', 'Categories', 'Attributes'].map((item) => (
                <div key={item} className="rounded-md border border-white/15 bg-white/10 p-3">
                  <p className="text-xs text-slate-300">Manage</p>
                  <p className="mt-1 text-sm font-bold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-950">{benefit.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>


      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-normal text-slate-950">Sell products before you source them yourself</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Catalog is the shared sellable product pool for Alfares services. Sellers can start with discounted supplier products from Alfares, publish their own inventory, or resell products that other users explicitly make available.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {salesSources.map((source) => (
              <article key={source.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-extrabold text-slate-950">{source.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{source.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-blue-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-normal text-slate-950">Sales automation is the operating model</h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Connect marketplace access once, keep product data current, and let Alfares prepare listings, fill channel accounts, synchronize catalog readiness, and support payment and order workflows across the connected sales services.
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-extrabold uppercase text-blue-700">Seller focus</p>
            <p className="mt-3 text-lg font-bold leading-7 text-slate-950">Manage products, approve channel access, sell, and ship. Alfares handles the repetitive marketplace work around publication, account fill, order flow, and sales operations.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-normal text-slate-950">Start with central Alfares Auth</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Public visitors see this landing page first. The Catalog dashboard opens after authentication. Internal admin tools stay inside a separate role-protected section.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((step, index) => (
              <div key={step} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-extrabold text-blue-700">0{index + 1}</p>
                <p className="mt-3 text-base font-bold text-slate-950">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
