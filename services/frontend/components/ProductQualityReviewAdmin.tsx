'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDashboardSidebarControls } from '@/contexts/DashboardSidebarContext';
import { attributesApi, type Attribute } from '@/lib/api/attributes';
import { categoriesApi, type Category } from '@/lib/api/categories';
import {
  productsApi,
  type ProductCatalogScope,
  type ProductQualityBulkUpdateRequest,
  type ProductQualityBulkUpdateResponse,
  type ProductQualityIssue,
  type ProductQualityReviewItem,
  type ProductQualityReviewQuery,
} from '@/lib/api/products';

type LifecycleFilter = 'all' | 'draft' | 'needs_review' | 'active' | 'archived';
type SeverityFilter = 'all' | 'blocking' | 'optional';
type ProductPatchKey =
  | 'brand'
  | 'manufacturer'
  | 'description'
  | 'tags'
  | 'seoTitle'
  | 'seoDescription'
  | 'lifecycle'
  | 'isActive';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const MISSING_FIELD_OPTIONS = [
  { value: 'any', label: 'Any blocker' },
  { value: 'sku', label: 'SKU' },
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'price', label: 'Price' },
  { value: 'image', label: 'Image' },
  { value: 'brand', label: 'Brand' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'tags', label: 'Tags' },
] as const;

const CATALOG_SCOPE_OPTIONS: Array<{ value: ProductCatalogScope; label: string }> = [
  { value: 'all', label: 'All visible products' },
  { value: 'effective', label: 'Effective catalog' },
  { value: 'own', label: 'Own products' },
  { value: 'alfares', label: 'Alfares source' },
  { value: 'community', label: 'Community source' },
];

function formatLifecycle(value?: string) {
  if (!value) return 'Unknown';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatNextAction(value?: string) {
  if (!value) return 'No action returned';
  return value.replace(/_/g, ' ').replace(/:/g, ': ');
}

function issueLabel(issue: ProductQualityIssue) {
  return issue.field || issue.code;
}

function sourceLabel(source: ProductQualityReviewItem['sourceScope']) {
  if (source === 'alfares') return 'Alfares';
  if (source === 'community') return 'Community';
  return 'Own';
}

function sourceTone(source: ProductQualityReviewItem['sourceScope']) {
  if (source === 'alfares') return 'bg-blue-100 text-blue-800';
  if (source === 'community') return 'bg-emerald-100 text-emerald-800';
  return 'bg-gray-100 text-gray-700';
}

function scoreTone(score: number) {
  if (score >= 85) return 'text-emerald-700';
  if (score >= 60) return 'text-amber-700';
  return 'text-red-700';
}

function flattenCategories(categories: Category[], prefix = ''): Array<{ id: string; label: string }> {
  return categories.flatMap((category) => {
    const label = prefix ? `${prefix} / ${category.name}` : category.name;
    return [
      { id: category.id, label },
      ...flattenCategories(category.children || [], label),
    ];
  });
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function numberFromInput(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function downloadText(filename: string, content: string, contentType: string) {
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

function IssuePills({
  issues,
  emptyLabel,
  tone,
}: {
  issues: ProductQualityIssue[];
  emptyLabel: string;
  tone: string;
}) {
  if (!issues.length) {
    return <span className="text-xs font-semibold text-gray-400">{emptyLabel}</span>;
  }

  return (
    <div className="flex max-w-md flex-wrap gap-1.5">
      {issues.slice(0, 5).map((issue) => (
        <span
          key={`${issue.code}:${issue.field || ''}`}
          title={issue.message}
          className={`rounded-md px-2 py-1 text-xs font-bold ${tone}`}
        >
          {issueLabel(issue)}
        </span>
      ))}
      {issues.length > 5 && (
        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
          +{issues.length - 5}
        </span>
      )}
    </div>
  );
}

export default function ProductQualityReviewAdmin() {
  const { setSidebarControls } = useDashboardSidebarControls();
  const [items, setItems] = useState<ProductQualityReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState('catalog.product_quality.v1');
  const [blockers, setBlockers] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('blocking');
  const [missingField, setMissingField] = useState('any');
  const [catalogScope, setCatalogScope] = useState<ProductCatalogScope>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [referencesError, setReferencesError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<ProductQualityBulkUpdateResponse | null>(null);
  const [productPatchEnabled, setProductPatchEnabled] = useState<Record<ProductPatchKey, boolean>>({
    brand: false,
    manufacturer: false,
    description: false,
    tags: false,
    seoTitle: false,
    seoDescription: false,
    lifecycle: false,
    isActive: false,
  });
  const [productPatchValues, setProductPatchValues] = useState<Record<ProductPatchKey, string>>({
    brand: '',
    manufacturer: '',
    description: '',
    tags: '',
    seoTitle: '',
    seoDescription: '',
    lifecycle: '',
    isActive: '',
  });
  const [categoryEnabled, setCategoryEnabled] = useState(false);
  const [categoryMode, setCategoryMode] = useState<'replace' | 'add'>('replace');
  const [categoryId, setCategoryId] = useState('');
  const [attributeEnabled, setAttributeEnabled] = useState(false);
  const [attributeId, setAttributeId] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [pricingEnabled, setPricingEnabled] = useState(false);
  const [pricingValues, setPricingValues] = useState({
    basePrice: '',
    salePrice: '',
    costPrice: '',
    currency: 'CZK',
    priceType: 'regular',
    isActive: 'true',
  });
  const [expectedMissingField, setExpectedMissingField] = useState('filter');
  const [humanReview, setHumanReview] = useState(false);

  const query = useMemo<ProductQualityReviewQuery>(() => ({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    lifecycle: lifecycle === 'all' ? undefined : lifecycle,
    severity: severity === 'all' ? undefined : severity,
    missingField: missingField === 'any' ? undefined : missingField,
    catalogScope,
  }), [catalogScope, debouncedSearch, lifecycle, missingField, page, pageSize, severity]);

  const pageIds = useMemo(() => items.map((item) => item.productId), [items]);
  const selectedCount = selectedIds.size;
  const currentPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const blockingCount = items.filter((item) => item.blockingIssues.length > 0).length;
  const optionalCount = items.filter((item) => item.optionalOpportunities.length > 0).length;

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await productsApi.getProductQualityReview(query);

    if (response.success && response.data) {
      setItems(response.data);
      setPolicyId(response.policyId || 'catalog.product_quality.v1');
      setBlockers(response.blockers || []);
      setTotal(response.pagination?.total ?? response.data.length);
      setTotalPages(response.pagination?.pages || 1);
    } else {
      setError(response.error?.message || 'Unable to load product quality review queue');
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  useEffect(() => {
    let mounted = true;
    Promise.all([categoriesApi.getCategoryTree(), attributesApi.getAttributes()])
      .then(([categoryResponse, attributeResponse]) => {
        if (!mounted) return;
        if (categoryResponse.success && categoryResponse.data) {
          setCategories(flattenCategories(categoryResponse.data));
        }
        if (attributeResponse.success && attributeResponse.data) {
          setAttributes(attributeResponse.data);
        }
        if (!categoryResponse.success || !attributeResponse.success) {
          setReferencesError('Some category or attribute controls could not load.');
        }
      })
      .catch(() => {
        if (mounted) setReferencesError('Category and attribute controls could not load.');
      });

    return () => {
      mounted = false;
    };
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
    setBulkResult(null);
    setBulkStatus(null);
  }, [catalogScope, debouncedSearch, lifecycle, missingField, pageSize, severity]);

  useEffect(() => {
    setSidebarControls(
      <div className="space-y-4">
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Review filters</h2>
          <p className="mt-1 text-[11px] leading-4 text-gray-500">Queue filters use the product quality policy.</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Search</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="SKU or title"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Severity</span>
          <select
            value={severity}
            onChange={(event) => {
              setPage(1);
              setSeverity(event.target.value as SeverityFilter);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="blocking">Mandatory blockers</option>
            <option value="optional">Optional opportunities</option>
            <option value="all">All review items</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Missing field</span>
          <select
            value={missingField}
            onChange={(event) => {
              setPage(1);
              setMissingField(event.target.value);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {MISSING_FIELD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Lifecycle</span>
          <select
            value={lifecycle}
            onChange={(event) => {
              setPage(1);
              setLifecycle(event.target.value as LifecycleFilter);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All lifecycle states</option>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs review</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Catalog scope</span>
          <select
            value={catalogScope}
            onChange={(event) => {
              setPage(1);
              setCatalogScope(event.target.value as ProductCatalogScope);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {CATALOG_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Rows</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPage(1);
              setPageSize(Number(event.target.value));
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>,
    );

    return () => setSidebarControls(null);
  }, [catalogScope, lifecycle, missingField, pageSize, search, setSidebarControls, severity]);

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

  const setPatchFieldEnabled = (field: ProductPatchKey, enabled: boolean) => {
    setProductPatchEnabled((current) => ({ ...current, [field]: enabled }));
  };

  const setPatchFieldValue = (field: ProductPatchKey, value: string) => {
    setProductPatchValues((current) => ({ ...current, [field]: value }));
  };

  const buildBulkPayload = (): ProductQualityBulkUpdateRequest | null => {
    const patch: Record<string, unknown> = {};
    if (productPatchEnabled.brand && productPatchValues.brand.trim()) patch.brand = productPatchValues.brand.trim();
    if (productPatchEnabled.manufacturer && productPatchValues.manufacturer.trim()) patch.manufacturer = productPatchValues.manufacturer.trim();
    if (productPatchEnabled.description && productPatchValues.description.trim()) patch.description = productPatchValues.description.trim();
    if (productPatchEnabled.tags) {
      const tags = splitTags(productPatchValues.tags);
      if (tags.length > 0) patch.tags = tags;
    }
    if (productPatchEnabled.lifecycle && productPatchValues.lifecycle) patch.lifecycle = productPatchValues.lifecycle;
    if (productPatchEnabled.isActive && productPatchValues.isActive) patch.isActive = productPatchValues.isActive === 'true';
    if ((productPatchEnabled.seoTitle && productPatchValues.seoTitle.trim()) || (productPatchEnabled.seoDescription && productPatchValues.seoDescription.trim())) {
      patch.seoData = {
        ...(productPatchEnabled.seoTitle && productPatchValues.seoTitle.trim() ? { title: productPatchValues.seoTitle.trim() } : {}),
        ...(productPatchEnabled.seoDescription && productPatchValues.seoDescription.trim() ? { description: productPatchValues.seoDescription.trim() } : {}),
      };
    }

    const categoryPatch = categoryEnabled && categoryId
      ? { mode: categoryMode, categoryId }
      : undefined;
    const attributePatch = attributeEnabled && attributeId && attributeValue.trim()
      ? { values: { [attributeId]: attributeValue.trim() } }
      : undefined;
    const pricingPatch: Record<string, unknown> = {};
    const basePrice = numberFromInput(pricingValues.basePrice);
    const salePrice = numberFromInput(pricingValues.salePrice);
    const costPrice = numberFromInput(pricingValues.costPrice);
    if (pricingEnabled) {
      if (basePrice !== undefined) pricingPatch.basePrice = basePrice;
      if (salePrice !== undefined) pricingPatch.salePrice = salePrice;
      if (costPrice !== undefined) pricingPatch.costPrice = costPrice;
      if (pricingValues.currency.trim()) pricingPatch.currency = pricingValues.currency.trim().toUpperCase();
      if (pricingValues.priceType.trim()) pricingPatch.priceType = pricingValues.priceType.trim();
      pricingPatch.isActive = pricingValues.isActive === 'true';
    }

    const hasPatch = Object.keys(patch).length > 0;
    const hasCategory = Boolean(categoryPatch);
    const hasAttribute = Boolean(attributePatch);
    const hasPricing = pricingEnabled && (basePrice !== undefined || salePrice !== undefined || costPrice !== undefined);
    if (!hasPatch && !hasCategory && !hasAttribute && !hasPricing) {
      return null;
    }

    const filteredExpectedMissingField = missingField === 'any' ? undefined : missingField;
    const expectedField = expectedMissingField === 'filter'
      ? filteredExpectedMissingField
      : expectedMissingField || undefined;

    return {
      productIds: Array.from(selectedIds),
      ...(hasPatch ? { patch } : {}),
      ...(hasCategory ? { categoryPatch } : {}),
      ...(hasAttribute ? { attributePatch } : {}),
      ...(hasPricing ? { pricingPatch } : {}),
      ...(expectedField ? { expectedMissingField: expectedField } : {}),
      ...(humanReview ? { humanReview: 'explicit' } : {}),
    };
  };

  const applyBulkUpdate = async () => {
    if (selectedCount === 0 || bulkBusy) return;
    if ((pricingEnabled && selectedCount > 10 && !humanReview) || (selectedCount > 50 && !humanReview)) {
      setBulkStatus('Set humanReview: explicit before this guarded bulk update.');
      return;
    }

    const payload = buildBulkPayload();
    if (!payload) {
      setBulkStatus('Select at least one product, category, attribute, or pricing update.');
      return;
    }

    setBulkBusy(true);
    setBulkStatus('Applying product quality bulk update...');
    setBulkResult(null);
    const response = await productsApi.bulkUpdateProductQualityReview(payload);
    if (response.success && response.data) {
      setBulkResult(response.data);
      setBulkStatus(`Updated ${response.data.totals.updated}; skipped ${response.data.totals.skipped}; blocked ${response.data.totals.blocked}.`);
      setSelectedIds(new Set());
      await loadReview();
    } else {
      setBulkStatus(response.error?.message || 'Bulk update failed.');
    }
    setBulkBusy(false);
  };

  const activateSelected = async () => {
    if (selectedCount === 0 || bulkBusy) return;
    if (selectedCount > 10 && !humanReview) {
      setBulkStatus('Set humanReview: explicit before activating more than 10 products.');
      return;
    }

    setBulkBusy(true);
    setBulkStatus('Running product quality activation gate...');
    setBulkResult(null);
    const response = await productsApi.activateProductQualityReview({
      productIds: Array.from(selectedIds),
      humanReview: humanReview ? 'explicit' : undefined,
      reason: 'catalog-admin-product-quality-review',
    });

    if (response.success && response.data) {
      setBulkStatus(`Activated ${response.data.totals.activated}; unchanged ${response.data.totals.unchanged}; blocked ${response.data.totals.blocked}.`);
      setSelectedIds(new Set());
      await loadReview();
    } else {
      setBulkStatus(response.error?.message || 'Activation failed.');
    }
    setBulkBusy(false);
  };

  const exportReview = async (format: 'json' | 'csv' | 'markdown') => {
    setExporting(format);
    const response = await productsApi.exportProductQualityReview({ ...query, format });
    if (response.success && response.data) {
      const content = typeof response.data.content === 'string'
        ? response.data.content
        : JSON.stringify(response.data.content, null, 2);
      const extension = format === 'markdown' ? 'md' : format;
      downloadText(`product-quality-review.${extension}`, content, response.data.contentType || 'text/plain');
    } else {
      setBulkStatus(response.error?.message || 'Export failed.');
    }
    setExporting(null);
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm font-semibold text-gray-600">Loading product quality queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{policyId}</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-gray-900">Product quality review</h1>
            <p className="mt-1 text-sm text-gray-600">
              {total.toLocaleString('en-US')} products match the current review queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['json', 'csv', 'markdown'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => exportReview(format)}
                disabled={Boolean(exporting)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold uppercase text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting === format ? 'Exporting...' : `Export ${format}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      {blockers.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <h2 className="text-sm font-extrabold text-amber-900">Fail-closed blockers</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {blockers.map((blocker) => (
              <span key={blocker} className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                {blocker}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Selected</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">{selectedCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Mandatory blockers</p>
          <p className="mt-1 text-2xl font-extrabold text-red-700">{blockingCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Optional opportunities</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{optionalCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Page</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">{page} / {totalPages}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Guarded bulk editor</h2>
            <p className="mt-1 text-sm text-gray-600">
              Applies through POST /api/products/review/bulk-update.
            </p>
            {referencesError && <p className="mt-1 text-sm font-semibold text-amber-700">{referencesError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(pageIds))}
              disabled={bulkBusy || pageIds.length === 0}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Select page
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkBusy || selectedCount === 0}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={applyBulkUpdate}
              disabled={bulkBusy || selectedCount === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkBusy ? 'Applying...' : 'Apply bulk update'}
            </button>
            <button
              type="button"
              onClick={activateSelected}
              disabled={bulkBusy || selectedCount === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Activate selected
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-4">
          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-xs font-extrabold uppercase text-gray-600">Product fields</legend>
            {([
              ['brand', 'Brand'],
              ['manufacturer', 'Manufacturer'],
              ['description', 'Description'],
              ['tags', 'Tags'],
              ['seoTitle', 'SEO title'],
              ['seoDescription', 'SEO description'],
            ] as Array<[ProductPatchKey, string]>).map(([field, label]) => (
              <label key={field} className="grid grid-cols-[auto_1fr] gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={productPatchEnabled[field]}
                  onChange={(event) => setPatchFieldEnabled(field, event.target.checked)}
                  className="mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="mb-1 block text-xs font-bold uppercase text-gray-500">{label}</span>
                  <input
                    type="text"
                    value={productPatchValues[field]}
                    onChange={(event) => setPatchFieldValue(field, event.target.value)}
                    disabled={!productPatchEnabled[field] || bulkBusy}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                  />
                </span>
              </label>
            ))}
            <label className="grid grid-cols-[auto_1fr] gap-2 text-sm">
              <input
                type="checkbox"
                checked={productPatchEnabled.lifecycle}
                onChange={(event) => setPatchFieldEnabled('lifecycle', event.target.checked)}
                className="mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="mb-1 block text-xs font-bold uppercase text-gray-500">Lifecycle</span>
                <select
                  value={productPatchValues.lifecycle}
                  onChange={(event) => setPatchFieldValue('lifecycle', event.target.value)}
                  disabled={!productPatchEnabled.lifecycle || bulkBusy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                >
                  <option value="">Choose lifecycle</option>
                  <option value="draft">Draft</option>
                  <option value="needs_review">Needs review</option>
                  <option value="active">Active</option>
                </select>
              </span>
            </label>
            <label className="grid grid-cols-[auto_1fr] gap-2 text-sm">
              <input
                type="checkbox"
                checked={productPatchEnabled.isActive}
                onChange={(event) => setPatchFieldEnabled('isActive', event.target.checked)}
                className="mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="mb-1 block text-xs font-bold uppercase text-gray-500">Active state</span>
                <select
                  value={productPatchValues.isActive}
                  onChange={(event) => setPatchFieldValue('isActive', event.target.value)}
                  disabled={!productPatchEnabled.isActive || bulkBusy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                >
                  <option value="">Choose state</option>
                  <option value="false">Inactive</option>
                  <option value="true">Active</option>
                </select>
              </span>
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-xs font-extrabold uppercase text-gray-600">Category and attributes</legend>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={categoryEnabled}
                onChange={(event) => setCategoryEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Category patch
            </label>
            <select
              value={categoryMode}
              onChange={(event) => setCategoryMode(event.target.value as 'replace' | 'add')}
              disabled={!categoryEnabled || bulkBusy}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="replace">Replace categories</option>
              <option value="add">Add category</option>
            </select>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={!categoryEnabled || bulkBusy}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 pt-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={attributeEnabled}
                onChange={(event) => setAttributeEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Attribute patch
            </label>
            <select
              value={attributeId}
              onChange={(event) => setAttributeId(event.target.value)}
              disabled={!attributeEnabled || bulkBusy}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="">Choose attribute</option>
              {attributes.map((attribute) => (
                <option key={attribute.id} value={attribute.id}>{attribute.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={attributeValue}
              onChange={(event) => setAttributeValue(event.target.value)}
              disabled={!attributeEnabled || bulkBusy}
              placeholder="Attribute value"
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
            />
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-xs font-extrabold uppercase text-gray-600">Pricing</legend>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={pricingEnabled}
                onChange={(event) => setPricingEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Pricing patch
            </label>
            {(['basePrice', 'salePrice', 'costPrice'] as const).map((field) => (
              <label key={field} className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-gray-500">{field}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingValues[field]}
                  onChange={(event) => setPricingValues((current) => ({ ...current, [field]: event.target.value }))}
                  disabled={!pricingEnabled || bulkBusy}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-gray-500">Currency</span>
                <input
                  type="text"
                  value={pricingValues.currency}
                  onChange={(event) => setPricingValues((current) => ({ ...current, currency: event.target.value }))}
                  disabled={!pricingEnabled || bulkBusy}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm uppercase disabled:bg-gray-50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-gray-500">Type</span>
                <input
                  type="text"
                  value={pricingValues.priceType}
                  onChange={(event) => setPricingValues((current) => ({ ...current, priceType: event.target.value }))}
                  disabled={!pricingEnabled || bulkBusy}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm disabled:bg-gray-50"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-xs font-extrabold uppercase text-gray-600">Guards</legend>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-gray-500">Expected issue</span>
              <select
                value={expectedMissingField}
                onChange={(event) => setExpectedMissingField(event.target.value)}
                disabled={bulkBusy}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm"
              >
                <option value="filter">Use current field filter</option>
                <option value="">No expected issue guard</option>
                {MISSING_FIELD_OPTIONS.filter((option) => option.value !== 'any').map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={humanReview}
                onChange={(event) => setHumanReview(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>humanReview: explicit</span>
            </label>
            {bulkStatus && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm font-semibold text-gray-700">
                {bulkStatus}
              </div>
            )}
            {bulkResult && (
              <div className="rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-900">
                Requested {bulkResult.totals.requested}, updated {bulkResult.totals.updated}, skipped {bulkResult.totals.skipped}, blocked {bulkResult.totals.blocked}.
              </div>
            )}
          </fieldset>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-gray-700">
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select products for guarded bulk repair'}
          </div>
          {loading && <span className="text-sm font-semibold text-blue-700">Refreshing...</span>}
        </div>

        {items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={currentPageSelected}
                        onChange={toggleCurrentPageSelection}
                        disabled={bulkBusy}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label="Select current page"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Lifecycle</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Mandatory blockers</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Optional opportunities</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Next action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.productId} className={selectedIds.has(item.productId) ? 'bg-blue-50/70' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.productId)}
                          onChange={() => toggleProductSelection(item.productId)}
                          disabled={bulkBusy}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select ${item.title}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/dashboard/products/${item.productId}`} className="text-sm font-extrabold text-blue-700 hover:text-blue-800">
                          {item.title || '(untitled)'}
                        </Link>
                        <p className="mt-1 text-xs font-semibold text-gray-500">{item.sku || 'missing SKU'}</p>
                        <p className="mt-1 text-[11px] text-gray-400">{item.ownerScope}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${sourceTone(item.sourceScope)}`}>
                          {sourceLabel(item.sourceScope)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                        {formatLifecycle(item.lifecycle)}
                        <span className={`mt-1 block text-xs ${item.canActivate ? 'text-emerald-700' : 'text-red-700'}`}>
                          {item.canActivate ? 'Can activate' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <IssuePills issues={item.blockingIssues} emptyLabel="No mandatory blockers" tone="bg-red-100 text-red-800" />
                      </td>
                      <td className="px-4 py-4">
                        <IssuePills issues={item.optionalOpportunities} emptyLabel="No optional gaps" tone="bg-amber-100 text-amber-800" />
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-lg font-extrabold ${scoreTone(item.completionScore)}`}>{item.completionScore}</span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                        {formatNextAction(item.nextAction)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-gray-700">
                Showing {items.length} of {total.toLocaleString('en-US')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || bulkBusy}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-extrabold text-white">
                  Page {page}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || bulkBusy}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-4 py-16 text-center">
            <h2 className="text-lg font-extrabold text-gray-900">No products match the current review filters</h2>
            <p className="mt-2 text-sm text-gray-600">Adjust filters in the sidebar to inspect another queue segment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
