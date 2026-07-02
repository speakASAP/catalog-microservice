'use client';

/**
 * Admin Products List Page
 * List all products with search, filter, bulk selection, and management actions
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { productsApi, Product, ProductQuery, PaginatedResponse } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';

type ActiveFilter = 'all' | 'active' | 'inactive';
type LifecycleFilter = 'all' | 'draft' | 'active' | 'archived' | 'needs_review';

const PAGE_LIMIT = 20;
const BULK_FETCH_LIMIT = 100;

function formatLifecycle(value?: Product['lifecycle']) {
  if (!value) return 'Active';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPrimaryImage(product: Product) {
  const images = (product.media || [])
    .filter((item) => item.type === 'image' && (item.thumbnailUrl || item.url))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (a.position ?? 0) - (b.position ?? 0));
  const image = images[0];

  return image ? { src: image.thumbnailUrl || image.url, alt: image.altText || image.title || product.title } : null;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  const query = useMemo<ProductQuery>(() => ({
    page,
    limit: PAGE_LIMIT,
    search: submittedSearch || undefined,
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
    lifecycle: lifecycleFilter === 'all' ? undefined : lifecycleFilter,
  }), [activeFilter, lifecycleFilter, page, submittedSearch]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productsApi.getProducts(query);
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Product>;
        if (Array.isArray(response.data)) {
          setProducts(response.data);
          setTotalPages(response.pagination?.pages || 1);
          setTotal(response.pagination?.total ?? response.data.length);
        } else if (data.items) {
          setProducts(data.items);
          setTotalPages(response.pagination?.pages || data.pagination?.pages || 1);
          setTotal(response.pagination?.total ?? data.pagination?.total ?? data.items.length);
        } else {
          setProducts([]);
          setTotalPages(1);
          setTotal(0);
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setSelectedIds(new Set());
    setAllFilteredSelected(false);
    setBulkStatus(null);
  }, [activeFilter, lifecycleFilter, submittedSearch]);

  const selectedCount = allFilteredSelected ? total : selectedIds.size;
  const pageIds = products.map((product) => product.id);
  const currentPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleProductSelection = (id: string) => {
    if (allFilteredSelected) setAllFilteredSelected(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCurrentPageSelection = () => {
    if (allFilteredSelected) setAllFilteredSelected(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (currentPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setAllFilteredSelected(false);
    setBulkStatus(null);
  };

  const fetchFilteredProductIds = async () => {
    const ids: string[] = [];
    let currentPage = 1;
    let pages = 1;

    do {
      const response = await productsApi.getProducts({
        ...query,
        page: currentPage,
        limit: BULK_FETCH_LIMIT,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load filtered products');
      }

      const data = response.data as PaginatedResponse<Product>;
      const items = Array.isArray(response.data) ? response.data : data.items || [];
      ids.push(...items.map((product) => product.id));
      pages = response.pagination?.pages || data.pagination?.pages || 1;
      currentPage += 1;
    } while (currentPage <= pages);

    return Array.from(new Set(ids));
  };

  const deleteProducts = async (ids: string[]) => {
    let deleted = 0;
    const failed: string[] = [];

    for (const id of ids) {
      setBulkStatus(`Deleting ${deleted + 1} of ${ids.length} products...`);
      const response = await productsApi.deleteProduct(id);
      if (response.success) {
        deleted += 1;
      } else {
        failed.push(id);
      }
    }

    return { deleted, failed };
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete product "${title}"?`)) {
      return;
    }

    try {
      const response = await productsApi.deleteProduct(id);
      if (response.success) {
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        setProducts((current) => current.filter((product) => product.id !== id));
        setTotal((current) => Math.max(0, current - 1));
        setBulkStatus(`Deleted "${title}".`);
      } else {
        alert(response.error?.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const handleBulkPublish = async () => {
    if (selectedCount === 0 || bulkBusy) return;

    setBulkBusy(true);
    setBulkStatus('Preparing publication selection...');

    try {
      const ids = allFilteredSelected ? await fetchFilteredProductIds() : Array.from(selectedIds);
      if (ids.length === 0) {
        setBulkStatus('No products matched the current selection.');
        return;
      }

      sessionStorage.setItem('catalog:bulkPublishSelection', JSON.stringify({
        productIds: ids,
        createdAt: new Date().toISOString(),
      }));
      router.push('/dashboard/products/publish');
    } catch (error) {
      console.error('Failed to prepare bulk publication:', error);
      setBulkStatus(null);
      alert(error instanceof Error ? error.message : 'Failed to prepare bulk publication');
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0 || bulkBusy) return;

    const scopeLabel = allFilteredSelected
      ? `all ${total} products matching the current filters`
      : `${selectedIds.size} selected products`;

    if (!confirm(`Delete ${scopeLabel}? This archives the products and removes them from active catalog use.`)) {
      return;
    }

    setBulkBusy(true);
    setBulkStatus('Preparing bulk delete...');

    try {
      const ids = allFilteredSelected ? await fetchFilteredProductIds() : Array.from(selectedIds);
      if (ids.length === 0) {
        setBulkStatus('No products matched the current selection.');
        return;
      }

      const result = await deleteProducts(ids);
      setSelectedIds(new Set());
      setAllFilteredSelected(false);
      setBulkStatus(
        result.failed.length
          ? `Deleted ${result.deleted}; ${result.failed.length} failed.`
          : `Deleted ${result.deleted} products.`,
      );
      await loadProducts();

      if (result.failed.length) {
        alert(`Bulk delete finished with ${result.failed.length} failed products. Try again or delete them individually.`);
      }
    } catch (error) {
      console.error('Failed to bulk delete products:', error);
      setBulkStatus(null);
      alert(error instanceof Error ? error.message : 'Failed to bulk delete products');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  };

  const updateActiveFilter = (value: ActiveFilter) => {
    setPage(1);
    setActiveFilter(value);
  };

  const updateLifecycleFilter = (value: LifecycleFilter) => {
    setPage(1);
    setLifecycleFilter(value);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xl font-semibold text-gray-600 mt-4">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">📦 Products</h1>
            <p className="text-xl text-blue-50">
              Manage products ({total} total)
            </p>
          </div>
          <Link
            href="/dashboard/products/new"
            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-center"
          >
            ➕ New Product
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="flex-1 border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
          >
            🔍 Search
          </button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Status</span>
            <select
              value={activeFilter}
              onChange={(e) => updateActiveFilter(e.target.value as ActiveFilter)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Type</span>
            <select
              value={lifecycleFilter}
              onChange={(e) => updateLifecycleFilter(e.target.value as LifecycleFilter)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
            >
              <option value="all">All types</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="needs_review">Needs review</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </div>

      {/* Bulk actions */}
      {products.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="text-sm font-semibold text-gray-700">
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select products to edit them as a group'}
            {bulkStatus && <span className="block text-blue-700 mt-1">{bulkStatus}</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setAllFilteredSelected(true);
                setSelectedIds(new Set(pageIds));
              }}
              disabled={bulkBusy || total === 0}
              className="px-4 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select all filtered ({total})
            </button>
            <button
              type="button"
              onClick={handleBulkPublish}
              disabled={bulkBusy || selectedCount === 0}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 Publish selected
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkBusy || selectedCount === 0}
              className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkBusy || selectedCount === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkBusy ? 'Deleting...' : '🗑️ Delete selected'}
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {products.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={currentPageSelected || allFilteredSelected}
                        onChange={toggleCurrentPageSelection}
                        disabled={bulkBusy}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label="Select current page products"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    const image = getPrimaryImage(product);

                    return (
                      <tr key={product.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected || selectedIds.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            disabled={bulkBusy}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            aria-label={`Select ${product.title}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <Link
                              href={`/dashboard/products/${product.id}`}
                              className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              {product.title}
                            </Link>
                            {product.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {image ? (
                            <img
                              src={image.src}
                              alt={image.alt}
                              className="h-14 w-14 rounded-lg border border-gray-200 object-cover bg-gray-50"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-400">
                              No image
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.brand || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                                product.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {product.isActive ? '✓ Active' : '✗ Inactive'}
                            </span>
                            <span className="px-3 py-1.5 text-xs font-bold rounded-full shadow-sm bg-gray-100 text-gray-700">
                              {formatLifecycle(product.lifecycle)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                          >
                            ✏️ Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.title)}
                            disabled={bulkBusy}
                            className="text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            🗑️ Delete
                          </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-gray-200">
                <div className="text-sm font-semibold text-gray-700">
                  Showing {products.length} of {total} products
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || bulkBusy}
                    className="px-6 py-2 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || bulkBusy}
                    className="px-6 py-2 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📦</div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-2">No products found</h2>
            <p className="text-gray-600 mb-6">Start by adding your first product</p>
            <Link
              href="/dashboard/products/new"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ➕ Create First Product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
