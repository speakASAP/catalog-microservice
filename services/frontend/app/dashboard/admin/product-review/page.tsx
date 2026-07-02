'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDashboardSidebarControls } from '@/contexts/DashboardSidebarContext';
import {
  ProductCatalogSource,
  ProductQualityReviewBulkUpdateRequest,
  ProductQualityReviewExportFormat,
  ProductQualityReviewIssue,
  ProductQualityReviewItem,
  ProductQualityReviewQuery,
  ProductQualityReviewSeverity,
  productsApi,
} from '@/lib/api/products';

type LifecycleFilter = 'all' | 'draft' | 'needs_review' | 'active' | 'archived';
type SourceFilter = 'all' | ProductCatalogSource;
type SeverityFilter = 'all' | ProductQualityReviewSeverity;
type BulkMode = 'basics' | 'pricing' | 'category';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

const MANDATORY_FIELDS = [
  { value: 'sku', label: 'SKU' },
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'price', label: 'Current price' },
  { value: 'image', label: 'Image' },
  { value: 'lifecycle', label: 'Lifecycle' },
];

const OPTIONAL_FIELDS = [
  { value: 'brand', label: 'Brand' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'ean', label: 'EAN' },
  { value: 'tags', label: 'Tags' },
  { value: 'category', label: 'Category' },
];

const FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  missing_sku: 'SKU',
  duplicate_sku: 'Duplicate SKU',
  title: 'Title',
  missing_title: 'Title',
  description: 'Description',
  missing_description: 'Description',
  price: 'Current price',
  missing_current_price: 'Current price',
  image: 'Image',
  missing_image: 'Image',
  placeholder_image_only: 'Image',
  lifecycle: 'Lifecycle',
  invalid_lifecycle_for_quality: 'Lifecycle',
  brand: 'Brand',
  missing_brand: 'Brand',
  manufacturer: 'Manufacturer',
  missing_manufacturer: 'Manufacturer',
  ean: 'EAN',
  tags: 'Tags',
  missing_tags: 'Tags',
  category: 'Category',
};

function fieldLabel(value: string) {
  return FIELD_LABELS[value] || value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function issueFieldKey(issue: ProductQualityReviewIssue) {
  if (issue.code === 'missing_current_price') return 'price';
  if (issue.code === 'missing_image' || issue.code === 'placeholder_image_only') return 'image';
  return issue.field || issue.code;
}

function lifecycleTone(lifecycle: string) {
  if (lifecycle === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (lifecycle === 'needs_review') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (lifecycle === 'archived') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function sourceTone(source: ProductCatalogSource) {
  if (source === 'alfares') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (source === 'community') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function formatLifecycle(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function splitList(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function numericValue(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function downloadFile(filename: string, contentType: string, content: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function IssuePills({ issues, emptyLabel, tone }: { issues: ProductQualityReviewIssue[]; emptyLabel: string; tone: 'blocking' | 'optional' }) {
  if (issues.length === 0) {
    return <span className="text-xs font-semibold text-slate-400">{emptyLabel}</span>;
  }

  const visibleIssues = issues.slice(0, 4);
  const badgeClass = tone === 'blocking'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="flex max-w-[360px] flex-wrap gap-1.5">
      {visibleIssues.map((issue) => (
        <span
          key={`${issue.code}-${issue.field || 'field'}`}
          title={issue.message}
          className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${badgeClass}`}
        >
          {fieldLabel(issueFieldKey(issue))}
        </span>
      ))}
      {issues.length > visibleIssues.length && (
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
          +{issues.length - visibleIssues.length}
        </span>
      )}
    </div>
  );
}

export default function ProductQualityReviewPage() {
  const { setSidebarControls } = useDashboardSidebarControls();
  const [items, setItems] = useState<ProductQualityReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [policyId, setPolicyId] = useState('catalog.product_quality.v1');
  const [policyBlockers, setPolicyBlockers] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(50);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [missingFieldFilter, setMissingFieldFilter] = useState('any');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('blocking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionBusy, setActionBusy] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState<BulkMode>('basics');
  const [expectedMissingField, setExpectedMissingField] = useState('');
  const [humanReview, setHumanReview] = useState(false);
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkBrand, setBulkBrand] = useState('');
  const [bulkManufacturer, setBulkManufacturer] = useState('');
  const [bulkEan, setBulkEan] = useState('');
  const [bulkTags, setBulkTags] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [currency, setCurrency] = useState('CZK');
  const [categoryIds, setCategoryIds] = useState('');
  const [categoryMode, setCategoryMode] = useState<'replace' | 'add'>('add');

  const query = useMemo<ProductQualityReviewQuery>(() => ({
    page,
    limit,
    search: debouncedSearch || undefined,
    lifecycle: lifecycleFilter === 'all' ? undefined : lifecycleFilter,
    catalogSources: sourceFilter === 'all' ? undefined : [sourceFilter],
    missingField: missingFieldFilter === 'any' ? undefined : missingFieldFilter,
    severity: severityFilter === 'all' ? undefined : severityFilter,
  }), [debouncedSearch, lifecycleFilter, limit, missingFieldFilter, page, severityFilter, sourceFilter]);

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await productsApi.getProductQualityReview(query);
    if (response.success && response.data) {
      setItems(response.data.items);
      setTotal(response.data.total);
      setPolicyId(response.data.policyId);
      setPolicyBlockers(response.data.blockers || []);
    } else {
      setError(response.error?.message || 'Unable to load product quality review');
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSelectedIds(new Set());
    setActionStatus(null);
  }, [debouncedSearch, lifecycleFilter, limit, missingFieldFilter, severityFilter, sourceFilter]);

  const pageIds = useMemo(() => items.map((item) => item.productId), [items]);
  const selectedCount = selectedIds.size;
  const selectedPageItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.productId)),
    [items, selectedIds],
  );
  const currentPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const blockingCount = items.filter((item) => item.blockingIssues.length > 0).length;
  const readyCount = items.filter((item) => item.canActivate).length;
  const optionalCount = items.filter((item) => item.optionalOpportunities.length > 0).length;

  const updateLifecycleFilter = (value: LifecycleFilter) => {
    setPage(1);
    setLifecycleFilter(value);
  };

  const updateSourceFilter = (value: SourceFilter) => {
    setPage(1);
    setSourceFilter(value);
  };

  const updateSeverityFilter = (value: SeverityFilter) => {
    setPage(1);
    setSeverityFilter(value);
  };

  const updateMissingFieldFilter = (value: string) => {
    setPage(1);
    setMissingFieldFilter(value);
  };

  const updateLimit = (value: number) => {
    setPage(1);
    setLimit(value);
  };

  useEffect(() => {
    setSidebarControls(
      <div className="space-y-4">
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Quality filters</h2>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">{policyId}</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Search</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="SKU or title"
            className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Issue type</span>
          <select
            value={severityFilter}
            onChange={(event) => updateSeverityFilter(event.target.value as SeverityFilter)}
            disabled={actionBusy}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All issues</option>
            <option value="blocking">Mandatory blockers</option>
            <option value="optional">Optional opportunities</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Field</span>
          <select
            value={missingFieldFilter}
            onChange={(event) => updateMissingFieldFilter(event.target.value)}
            disabled={actionBusy}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="any">Any field</option>
            <optgroup label="Mandatory blockers">
              {MANDATORY_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>{field.label}</option>
              ))}
            </optgroup>
            <optgroup label="Optional opportunities">
              {OPTIONAL_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>{field.label}</option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Lifecycle</span>
          <select
            value={lifecycleFilter}
            onChange={(event) => updateLifecycleFilter(event.target.value as LifecycleFilter)}
            disabled={actionBusy}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All lifecycles</option>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs review</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Source</span>
          <select
            value={sourceFilter}
            onChange={(event) => updateSourceFilter(event.target.value as SourceFilter)}
            disabled={actionBusy}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All sources</option>
            <option value="own">Own</option>
            <option value="alfares">Alfares</option>
            <option value="community">Community</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">Rows</span>
          <select
            value={limit}
            onChange={(event) => updateLimit(Number(event.target.value))}
            disabled={actionBusy}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>,
    );

    return () => setSidebarControls(null);
  }, [actionBusy, limit, lifecycleFilter, missingFieldFilter, policyId, search, setSidebarControls, severityFilter, sourceFilter]);

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

  const toggleProductSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildBulkPayload = (): ProductQualityReviewBulkUpdateRequest | null => {
    const productIds = Array.from(selectedIds);
    const payload: ProductQualityReviewBulkUpdateRequest = { productIds };
    if (expectedMissingField) payload.expectedMissingField = expectedMissingField;
    if (humanReview) payload.humanReview = 'explicit';

    if (bulkMode === 'basics') {
      const patch: NonNullable<ProductQualityReviewBulkUpdateRequest['patch']> = {};
      if (bulkDescription.trim()) patch.description = bulkDescription.trim();
      if (bulkBrand.trim()) patch.brand = bulkBrand.trim();
      if (bulkManufacturer.trim()) patch.manufacturer = bulkManufacturer.trim();
      if (bulkEan.trim()) patch.ean = bulkEan.trim();
      const tags = splitList(bulkTags);
      if (tags.length > 0) patch.tags = tags;
      if (Object.keys(patch).length === 0) return null;
      payload.patch = patch;
      return payload;
    }

    if (bulkMode === 'pricing') {
      const pricePatch: NonNullable<ProductQualityReviewBulkUpdateRequest['pricingPatch']> = {};
      const base = numericValue(basePrice);
      const sale = numericValue(salePrice);
      if (base !== undefined) pricePatch.basePrice = base;
      if (sale !== undefined) pricePatch.salePrice = sale;
      if (currency.trim()) pricePatch.currency = currency.trim().toUpperCase();
      pricePatch.isActive = true;
      if (base === undefined && sale === undefined) return null;
      payload.pricingPatch = pricePatch;
      return payload;
    }

    const ids = splitList(categoryIds);
    if (ids.length === 0) return null;
    payload.categoryPatch = { categoryIds: ids, mode: categoryMode };
    return payload;
  };

  const handleBulkUpdate = async () => {
    if (selectedCount === 0 || actionBusy) return;
    if (selectedCount > 10 && !humanReview) {
      alert('Bulk changes above 10 products require the human review marker.');
      return;
    }

    const payload = buildBulkPayload();
    if (!payload) {
      alert('Add at least one bulk update value before applying changes.');
      return;
    }

    if (!window.confirm(`Apply guarded bulk update to ${selectedCount} selected products?`)) {
      return;
    }

    setActionBusy(true);
    setActionStatus('Applying bulk update...');
    const response = await productsApi.bulkUpdateAfterQualityReview(payload);
    if (response.success && response.data) {
      const totals = response.data.totals;
      setActionStatus(`Updated ${totals.updated}; skipped ${totals.skipped}; blocked ${totals.blocked}.`);
      await loadReview();
    } else {
      setActionStatus(response.error?.message || 'Bulk update failed');
    }
    setActionBusy(false);
  };

  const handleActivate = async () => {
    if (selectedCount === 0 || actionBusy) return;
    if (selectedCount > 10 && !humanReview) {
      alert('Activation above 10 products requires the human review marker.');
      return;
    }

    if (!window.confirm(`Run activation gate for ${selectedCount} selected products?`)) {
      return;
    }

    setActionBusy(true);
    setActionStatus('Running activation gate...');
    const response = await productsApi.activateAfterQualityReview({
      productIds: Array.from(selectedIds),
      humanReview: humanReview ? 'explicit' : undefined,
      reason: 'catalog-admin-product-quality-review',
    });

    if (response.success && response.data) {
      const totals = response.data.totals;
      setActionStatus(`Activated ${totals.activated}; unchanged ${totals.unchanged}; blocked ${totals.blocked}.`);
      await loadReview();
    } else {
      setActionStatus(response.error?.message || 'Activation failed');
    }
    setActionBusy(false);
  };

  const handleExport = async (format: ProductQualityReviewExportFormat) => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionStatus(`Preparing ${format} export...`);
    const response = await productsApi.exportProductQualityReview({ ...query, format, page: 1, limit: 200 });
    if (response.success && response.data) {
      const extension = format === 'markdown' ? 'md' : format;
      const content = typeof response.data.content === 'string'
        ? response.data.content
        : JSON.stringify(response.data.content, null, 2);
      downloadFile(
        `product-quality-review-${new Date().toISOString().slice(0, 10)}.${extension}`,
        response.data.contentType,
        content,
      );
      setActionStatus(`Exported ${response.data.items.length} products as ${format}.`);
    } else {
      setActionStatus(response.error?.message || 'Export failed');
    }
    setActionBusy(false);
  };

  return (
    <AdminGuard>
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">Product quality review</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">Catalog activation blockers</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Global mandatory blockers follow {policyId}. Optional fields stay recommendations, and stock remains Warehouse-owned.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['json', 'csv', 'markdown'] as ProductQualityReviewExportFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleExport(format)}
                  disabled={actionBusy}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {policyBlockers.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              {policyBlockers.join('; ')}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Filtered total</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{total.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-red-600">Page blockers</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{blockingCount}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-emerald-600">Ready on page</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{readyCount}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-amber-600">Optional gaps</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{optionalCount}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Guarded bulk actions</h2>
              <p className="mt-1 text-sm text-slate-600">
                {selectedCount > 0 ? `${selectedCount} products selected` : 'Select products from the queue before applying changes.'}
                {selectedPageItems.length > 0 && ` ${selectedPageItems.filter((item) => item.canActivate).length} selected on this page can activate.`}
              </p>
              {actionStatus && <p className="mt-2 text-sm font-semibold text-blue-700">{actionStatus}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(pageIds))}
                disabled={actionBusy || pageIds.length === 0}
                className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select page
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={actionBusy || selectedCount === 0}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={actionBusy || selectedCount === 0}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Activate selected
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)_220px]">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Patch</span>
              <select
                value={bulkMode}
                onChange={(event) => setBulkMode(event.target.value as BulkMode)}
                disabled={actionBusy}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="basics">Product fields</option>
                <option value="pricing">Pricing</option>
                <option value="category">Categories</option>
              </select>
            </label>

            <div className="grid gap-3 lg:grid-cols-2">
              {bulkMode === 'basics' && (
                <>
                  <label className="block lg:col-span-2">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Description</span>
                    <textarea
                      value={bulkDescription}
                      onChange={(event) => setBulkDescription(event.target.value)}
                      disabled={actionBusy}
                      rows={3}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Brand</span>
                    <input
                      value={bulkBrand}
                      onChange={(event) => setBulkBrand(event.target.value)}
                      disabled={actionBusy}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Manufacturer</span>
                    <input
                      value={bulkManufacturer}
                      onChange={(event) => setBulkManufacturer(event.target.value)}
                      disabled={actionBusy}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">EAN</span>
                    <input
                      value={bulkEan}
                      onChange={(event) => setBulkEan(event.target.value)}
                      disabled={actionBusy}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Tags</span>
                    <input
                      value={bulkTags}
                      onChange={(event) => setBulkTags(event.target.value)}
                      disabled={actionBusy}
                      placeholder="tag-1, tag-2"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </>
              )}

              {bulkMode === 'pricing' && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Base price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={basePrice}
                      onChange={(event) => setBasePrice(event.target.value)}
                      disabled={actionBusy}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Sale price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salePrice}
                      onChange={(event) => setSalePrice(event.target.value)}
                      disabled={actionBusy}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Currency</span>
                    <input
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      disabled={actionBusy}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </>
              )}

              {bulkMode === 'category' && (
                <>
                  <label className="block lg:col-span-2">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Category IDs</span>
                    <input
                      value={categoryIds}
                      onChange={(event) => setCategoryIds(event.target.value)}
                      disabled={actionBusy}
                      placeholder="uuid-1, uuid-2"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Mode</span>
                    <select
                      value={categoryMode}
                      onChange={(event) => setCategoryMode(event.target.value as 'replace' | 'add')}
                      disabled={actionBusy}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="add">Add</option>
                      <option value="replace">Replace</option>
                    </select>
                  </label>
                </>
              )}
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-600">Field guard</span>
                <select
                  value={expectedMissingField}
                  onChange={(event) => setExpectedMissingField(event.target.value)}
                  disabled={actionBusy}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">No guard</option>
                  <optgroup label="Mandatory blockers">
                    {MANDATORY_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Optional opportunities">
                    {OPTIONAL_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={humanReview}
                  onChange={(event) => setHumanReview(event.target.checked)}
                  disabled={actionBusy}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Human review marker</span>
              </label>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={actionBusy || selectedCount === 0}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply bulk update
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-semibold text-slate-700">
              Showing {items.length} of {total.toLocaleString('en-US')} products
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1 || actionBusy}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="rounded-md bg-slate-100 px-3 py-2 font-bold text-slate-700">Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || actionBusy}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {loading && items.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-3 text-sm font-semibold text-slate-600">Loading quality queue...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-sm font-semibold text-red-700">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="text-lg font-bold text-slate-950">No matching products</h2>
              <p className="mt-1 text-sm text-slate-600">Adjust filters to review another slice.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={currentPageSelected}
                        onChange={toggleCurrentPageSelection}
                        disabled={actionBusy}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label="Select current page"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">State</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Mandatory blockers</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Optional opportunities</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Next action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.productId} className="hover:bg-blue-50/40">
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.productId)}
                          onChange={() => toggleProductSelection(item.productId)}
                          disabled={actionBusy}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select ${item.title}`}
                        />
                      </td>
                      <td className="min-w-[260px] px-4 py-4 align-top">
                        <Link
                          href={`/dashboard/products/${item.productId}`}
                          className="text-sm font-bold text-blue-700 hover:text-blue-800"
                        >
                          {item.title || '(untitled product)'}
                        </Link>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{item.sku || 'No SKU'}</div>
                        <div className="mt-1 text-xs text-slate-400">{item.ownerScope}</div>
                      </td>
                      <td className="min-w-[150px] px-4 py-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-bold ${lifecycleTone(item.lifecycle)}`}>
                            {formatLifecycle(item.lifecycle)}
                          </span>
                          <span className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-bold ${sourceTone(item.sourceScope)}`}>
                            {fieldLabel(item.sourceScope)}
                          </span>
                          <span className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-bold ${item.canActivate ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            {item.canActivate ? 'Can activate' : 'Blocked'}
                          </span>
                        </div>
                      </td>
                      <td className="min-w-[130px] px-4 py-4 align-top">
                        <div className="text-sm font-bold text-slate-900">{item.completionScore}%</div>
                        <div className="mt-2 h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full ${item.canActivate ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.max(0, Math.min(100, item.completionScore))}%` }}
                          />
                        </div>
                      </td>
                      <td className="min-w-[240px] px-4 py-4 align-top">
                        <IssuePills issues={item.blockingIssues} emptyLabel="None" tone="blocking" />
                      </td>
                      <td className="min-w-[240px] px-4 py-4 align-top">
                        <IssuePills issues={item.optionalOpportunities} emptyLabel="None" tone="optional" />
                      </td>
                      <td className="min-w-[220px] px-4 py-4 align-top text-sm font-semibold text-slate-700">
                        {fieldLabel(item.nextAction.replace('resolve_blockers:', 'Resolve '))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
