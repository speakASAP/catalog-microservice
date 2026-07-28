'use client';

/**
 * Admin Products List Page
 * List all products with search, filter, bulk selection, and management actions
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { productsApi, Product, ProductQuery, PaginatedResponse, ProductWarehouseAvailabilityItem, CatalogSourceSettings } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardSidebarControls } from '@/contexts/DashboardSidebarContext';
import { canMutateCatalogProduct } from "@/lib/catalogAccess";
import ImportFromUrlDialog from '@/components/ImportFromUrlDialog';

type ActiveFilter = 'all' | 'active' | 'inactive';
type LifecycleFilter = 'all' | 'draft' | 'active' | 'archived' | 'needs_review';

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;

function formatLifecycle(value?: Product['lifecycle']) {
  if (!value) return 'Active';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getProductStatusBadge(product: Product) {
  if (product.isActive === false) {
    return { label: 'Inactive', tone: 'bg-red-100 text-red-800' };
  }

  if (product.lifecycle && product.lifecycle !== 'active') {
    const lifecycleTone = product.lifecycle === 'needs_review'
      ? 'bg-amber-100 text-amber-800'
      : product.lifecycle === 'draft'
        ? 'bg-gray-100 text-gray-700'
        : 'bg-red-100 text-red-800';

    return { label: formatLifecycle(product.lifecycle), tone: lifecycleTone };
  }

  return { label: 'Active', tone: 'bg-green-100 text-green-800' };
}

function formatQuantity(value?: number | null) {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(Number(value) || 0)));
}

function getPrimaryImage(product: Product) {
  const images = (product.media || [])
    .filter((item) => item.type === 'image' && (item.thumbnailUrl || item.url))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (a.position ?? 0) - (b.position ?? 0));
  const image = images[0];

  return image ? { src: image.thumbnailUrl || image.url, alt: image.altText || image.title || product.title } : null;
}

function getProductSource(product: Product) {
  if (!product.ownerUserId) {
    return { label: 'Alfares', tone: 'bg-blue-100 text-blue-800' };
  }
  if (product.resaleEnabled) {
    return { label: 'Seller shared', tone: 'bg-emerald-100 text-emerald-800' };
  }
  return { label: 'Private', tone: 'bg-gray-100 text-gray-700' };
}

function getSupplierSummary(availability?: ProductWarehouseAvailabilityItem) {
  const supplierIds = Array.from(new Set(
    (availability?.warehouses || [])
      .filter((warehouse) => Number(warehouse.quantity ?? warehouse.available ?? 0) > 0)
      .map((warehouse) => warehouse.supplierId)
      .filter((supplierId): supplierId is string => Boolean(supplierId)),
  ));

  if (supplierIds.length === 0) {
    return { label: 'No supplier stock', detail: '' };
  }
  return {
    label: supplierIds.length === 1 ? supplierIds[0] : `${supplierIds.length} suppliers`,
    detail: supplierIds.length === 1 ? 'Supplier stock' : supplierIds.join(', '),
  };
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setSidebarControls } = useDashboardSidebarControls();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [availabilityByProductId, setAvailabilityByProductId] = useState<Record<string, ProductWarehouseAvailabilityItem>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [catalogSettings, setCatalogSettings] = useState<CatalogSourceSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const selectedCatalogSources = useMemo<ProductQuery['catalogSources']>(() => {
    if (!catalogSettings) return undefined;
    const sources: NonNullable<ProductQuery['catalogSources']> = ['own'];
    if (catalogSettings.includeAlfaresCatalog) sources.push('alfares');
    if (catalogSettings.includeCommunityCatalog) sources.push('community');
    return sources;
  }, [catalogSettings]);

  const query = useMemo<ProductQuery>(() => ({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
    lifecycle: lifecycleFilter === 'all' ? undefined : lifecycleFilter,
    catalogSources: selectedCatalogSources,
    supplierId: supplierFilter.trim() || undefined,
  }), [activeFilter, debouncedSearch, lifecycleFilter, page, pageSize, selectedCatalogSources, supplierFilter]);

  const loadProducts = useCallback(async () => {
    if (!catalogSettings) return;

    setLoading(true);
    try {
      const response = await productsApi.getProducts(query);
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Product>;
        let nextProducts: Product[] = [];

        if (Array.isArray(response.data)) {
          nextProducts = response.data;
          setTotalPages(response.pagination?.pages || 1);
          setTotal(response.pagination?.total ?? response.data.length);
        } else if (data.items) {
          nextProducts = data.items;
          setTotalPages(response.pagination?.pages || data.pagination?.pages || 1);
          setTotal(response.pagination?.total ?? data.pagination?.total ?? data.items.length);
        } else {
          setTotalPages(1);
          setTotal(0);
        }

        setProducts(nextProducts);
        setAvailabilityByProductId({});

        if (nextProducts.length > 0) {
          setAvailabilityLoading(true);
          try {
            const availabilityResponse = await productsApi.getAvailabilityBatch(nextProducts.map((product) => product.id));
            if (availabilityResponse.success && availabilityResponse.data) {
              const nextAvailability = Object.fromEntries(
                availabilityResponse.data.items.map((item) => [item.productId, item]),
              );
              setAvailabilityByProductId(nextAvailability);
            }
          } catch (availabilityError) {
            console.error('Failed to load product availability:', availabilityError);
          } finally {
            setAvailabilityLoading(false);
          }
        } else {
          setAvailabilityLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [catalogSettings, query]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    let mounted = true;
    productsApi.provisionCatalogAccess('catalog').then((response) => {
      if (!mounted) return;
      if (response.success && response.data) {
        setCatalogSettings(response.data);
      }
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSelectedIds(new Set());
    setBulkStatus(null);
  }, [activeFilter, lifecycleFilter, debouncedSearch, pageSize, supplierFilter]);

  const selectedCount = selectedIds.size;
  const pageIds = products.map((product) => product.id);
  const currentPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const canMutateProduct = useCallback((product: Product) => canMutateCatalogProduct(product, user), [user]);

  const toggleProductSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCurrentPageSelection = () => {
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
    setBulkStatus(null);
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
      const ids = Array.from(selectedIds);
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

    const scopeLabel = `${selectedIds.size} selected products`;

    if (!confirm(`Delete ${scopeLabel}? This archives the products and removes them from active catalog use.`)) {
      return;
    }

    setBulkBusy(true);
    setBulkStatus('Preparing bulk delete...');

    try {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) {
        setBulkStatus('No products matched the current selection.');
        return;
      }

      const result = await deleteProducts(ids);
      setSelectedIds(new Set());
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

  const updateActiveFilter = (value: ActiveFilter) => {
    setPage(1);
    setActiveFilter(value);
  };

  const updateLifecycleFilter = (value: LifecycleFilter) => {
    setPage(1);
    setLifecycleFilter(value);
  };

  const updateCatalogSource = async (field: 'includeAlfaresCatalog' | 'includeCommunityCatalog', value: boolean) => {
    setSettingsSaving(true);
    try {
      const response = await productsApi.updateCatalogSettings({ [field]: value });
      if (response.success && response.data) {
        setCatalogSettings(response.data);
        setPage(1);
      } else {
        alert(response.error?.message || 'Failed to update catalog source settings');
      }
    } finally {
      setSettingsSaving(false);
    }
  };

  const updatePageSize = (value: number) => {
    setPage(1);
    setPageSize(Math.min(200, Math.max(1, value)));
  };

  useEffect(() => {
    setSidebarControls(
      <div className="space-y-4">
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Product filters</h2>
          <p className="mt-1 text-[11px] leading-4 text-gray-500">Changes load the first matching page immediately.</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Status</legend>
          {[
            ['active', 'Active only'],
            ['all', 'All statuses'],
            ['inactive', 'Inactive only'],
          ].map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
              <input
                type="radio"
                name="product-active-filter"
                checked={activeFilter === value}
                onChange={() => updateActiveFilter(value as ActiveFilter)}
                disabled={bulkBusy}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Type</span>
          <select
            value={lifecycleFilter}
            onChange={(e) => updateLifecycleFilter(e.target.value as LifecycleFilter)}
            disabled={bulkBusy}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All types</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs review</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Supplier ID</span>
          <input
            type="text"
            value={supplierFilter}
            onChange={(event) => {
              setPage(1);
              setSupplierFilter(event.target.value);
            }}
            placeholder="Filter by supplier ID"
            disabled={bulkBusy}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <fieldset className="space-y-2 border-t border-gray-200 pt-4">
          <legend className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Catalog sources</legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold text-gray-800">
            <input
              type="checkbox"
              checked={catalogSettings?.includeAlfaresCatalog === true}
              disabled={settingsSaving || !catalogSettings}
              onChange={(event) => updateCatalogSource('includeAlfaresCatalog', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Alfares products</span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold text-gray-800">
            <input
              type="checkbox"
              checked={catalogSettings?.includeCommunityCatalog === true}
              disabled={settingsSaving || !catalogSettings}
              onChange={(event) => updateCatalogSource('includeCommunityCatalog', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Other sellers</span>
          </label>
        </fieldset>
      </div>,
    );

    return () => setSidebarControls(null);
  }, [
    activeFilter,
    bulkBusy,
    catalogSettings,
    lifecycleFilter,
    search,
    supplierFilter,
    setSidebarControls,
    settingsSaving,
  ]);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg p-5 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">📦 Products</h1>
            <p className="text-sm md:text-base text-blue-50">
              Manage products ({total} total)
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setImportDialogOpen(true)}
              className="bg-blue-500/30 border border-white/40 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500/50 transition-all shadow-md hover:shadow-lg text-center"
            >
              🔗 Import from URL
            </button>
            <Link
              href="/dashboard/products/new"
              className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-all shadow-md hover:shadow-lg text-center"
            >
              ➕ New Product
            </Link>
          </div>
        </div>
      </div>

      <ImportFromUrlDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={() => loadProducts()}
      />

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
                setSelectedIds(new Set(pageIds));
              }}
              disabled={bulkBusy || pageIds.length === 0}
              className="px-4 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select page ({pageIds.length})
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
                        checked={currentPageSelected}
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
                      Available
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Supplier
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
                    const source = getProductSource(product);
                    const availability = availabilityByProductId[product.id];
                    const supplier = getSupplierSummary(availability);

                    return (
                      <tr key={product.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(() => {
                            const availability = availabilityByProductId[product.id];
                            const available = availability?.totalAvailable ?? 0;
                            return (
                              <div className="space-y-1">
                                <div className={`text-base font-extrabold ${available > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {availabilityLoading && !availability ? 'Loading...' : `${formatQuantity(available)} pcs`}
                                </div>
                                {availability && (
                                  <div className="text-xs font-medium text-gray-500">
                                    {formatQuantity(availability.totalQuantity)} total / {formatQuantity(availability.totalReserved)} reserved
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${source.tone}`}>
                            {source.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                          <div className="max-w-[180px] truncate font-bold text-gray-800" title={supplier.detail || supplier.label}>
                            {availabilityLoading && !availability ? 'Loading...' : supplier.label}
                          </div>
                          {supplier.detail && <div className="max-w-[180px] truncate text-gray-500" title={supplier.detail}>{supplier.detail}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const status = getProductStatusBadge(product);

                            return (
                              <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${status.tone}`}>
                                {status.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                          >
                            {canMutateProduct(product) ? '✏️ Edit' : 'View'}
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.title)}
                            disabled={bulkBusy || !canMutateProduct(product)}
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="text-sm font-semibold text-gray-700">
                    Showing {products.length} of {total} products
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <span>Per page</span>
                    <select
                      value={pageSize}
                      onChange={(event) => updatePageSize(Number(event.target.value))}
                      disabled={bulkBusy}
                      className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm font-bold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
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
