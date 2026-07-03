'use client';

import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api/products';
import { categoriesApi } from '@/lib/api/categories';
import { attributesApi } from '@/lib/api/attributes';
import LoadingSpinner from '@/components/LoadingSpinner';
import DashboardPageShell from '@/components/DashboardPageShell';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    attributes: 0,
    loading: true,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [productsRes, categoriesRes, attributesRes] = await Promise.all([
          productsApi.getProducts({ limit: 1 }),
          categoriesApi.getCategories(),
          attributesApi.getAttributes(),
        ]);

        setStats({
          products: productsRes.success
            ? productsRes.pagination?.total
              ?? (Array.isArray(productsRes.data) ? productsRes.data.length : productsRes.data?.pagination?.total)
              ?? 0
            : 0,
          categories: categoriesRes.success && categoriesRes.data ? categoriesRes.data.length : 0,
          attributes: attributesRes.success && attributesRes.data ? attributesRes.data.length : 0,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, []);

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardPageShell
      icon="📦"
      title="Catalog Dashboard"
      subtitle="Central product catalog management"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/products" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.products}</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </Link>

        <Link href="/dashboard/categories" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.categories}</p>
            </div>
            <div className="text-4xl">📁</div>
          </div>
        </Link>

        <Link href="/dashboard/attributes" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attributes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.attributes}</p>
            </div>
            <div className="text-4xl">🏷️</div>
          </div>
        </Link>
      </div>
    </DashboardPageShell>
  );
}
