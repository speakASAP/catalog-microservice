'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { productsApi, Product, ProductSalesChannel, ProductSalesStatistics, ProductWarehouseAvailabilityItem, ProductWarehouseLogisticsOption } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';
import MediaManagement from '@/components/MediaManagement';
import PricingManagement from '@/components/PricingManagement';
import BazosPublishPanel from '@/components/BazosPublishPanel';
import AukroPublishPanel from '@/components/AukroPublishPanel';
import AllegroPublishPanel from '@/components/AllegroPublishPanel';
import ChannelSalesPanel from '@/components/ChannelSalesPanel';
import MarketplaceFieldsPanel from '@/components/MarketplaceFieldsPanel';
import ProductContentPreviewPanel from '@/components/ProductContentPreviewPanel';
import { useAuth } from '@/contexts/AuthContext';


const channelLabels: Record<string, string> = {
  flipflop: 'FlipFlop',
  allegro: 'Allegro',
  aukro: 'Aukro',
  bazos: 'Bazos',
  heureka: 'Heureka',
};

const defaultSalesChannels = ['flipflop', 'bazos', 'allegro', 'aukro', 'heureka'];

const buildFallbackSalesChannels = (
  productId: string,
  status: 'zero' | 'unavailable',
  unavailableReason?: string,
): ProductSalesChannel[] => defaultSalesChannels.map((channel) => ({
  productId,
  channel,
  currency: 'CZK',
  orderCount: 0,
  quantitySold: 0,
  grossSales: 0,
  lastOrderedAt: null,
  status,
  unavailableReason,
}));

const formatGrossSales = (totals: Array<{ currency: string; amount: number }> = []) => {
  if (totals.length === 0) {
    return '0 CZK';
  }
  return totals
    .map((total) => `${total.amount.toLocaleString('cs-CZ')} ${total.currency}`)
    .join(' / ');
};

const formatMetricLabel = (value: string) => value
  .split(/[_\s-]+/)
  .filter(Boolean)
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join(' ');

const deliveryExceptionKeys = [
  { key: 'notReceived', label: 'Not received' },
  { key: 'returned', label: 'Returned' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'unfulfilled', label: 'Unfulfilled' },
] as const;

const formatQuantity = (value: number | null | undefined) => Number(value ?? 0).toLocaleString("cs-CZ");

const isReservableRoute = (route: ProductWarehouseLogisticsOption) => {
  if (!route.canReserveFromWarehouse || Number(route.available ?? 0) <= 0) {
    return false;
  }

  if (route.routeType === "supplier_replenishment" || route.routeType === "supplier_dropship") {
    return Boolean(route.supplierId);
  }

  return route.routeType === "local_fulfillment";
};

const getWarehouseRouteStatus = (availability: ProductWarehouseAvailabilityItem | null) => {
  if (!availability) {
    return { label: "Unavailable", tone: "bg-amber-100 text-amber-800", detail: "Warehouse availability is not loaded." };
  }

  const totalAvailable = Number(availability.totalAvailable ?? 0);
  if (totalAvailable <= 0) {
    return { label: "Out of stock", tone: "bg-gray-200 text-gray-700", detail: "Warehouse reports no available quantity." };
  }

  const routes = availability.logistics?.options ?? [];
  if (routes.some(isReservableRoute)) {
    return { label: "Sellable", tone: "bg-emerald-100 text-emerald-800", detail: "Warehouse has available stock on a reservable route." };
  }

  return { label: "Route needed", tone: "bg-amber-100 text-amber-800", detail: "Warehouse has stock, but no reservable logistics route is confirmed." };
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const productId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [salesStats, setSalesStats] = useState<ProductSalesStatistics | null>(null);
  const [salesStatsLoading, setSalesStatsLoading] = useState(false);
  const [salesStatsError, setSalesStatsError] = useState<string | null>(null);
  const [warehouseAvailability, setWarehouseAvailability] = useState<ProductWarehouseAvailabilityItem | null>(null);
  const [warehouseAvailabilityLoading, setWarehouseAvailabilityLoading] = useState(false);
  const [warehouseAvailabilityError, setWarehouseAvailabilityError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    title: '',
    description: '',
    brand: '',
    manufacturer: '',
    ean: '',
    weightKg: '',
    length: '',
    width: '',
    height: '',
    isActive: true,
    resaleEnabled: false,
  });


  const loadSalesStats = useCallback(async () => {
    setSalesStatsLoading(true);
    setSalesStatsError(null);

    try {
      const response = await productsApi.getSalesStatistics(productId);
      if (response.success && response.data) {
        setSalesStats(response.data);
      } else {
        setSalesStats(null);
        setSalesStatsError(response.error?.message || 'Sales statistics are unavailable.');
      }
    } catch (error) {
      console.error('Failed to load sales statistics:', error);
      setSalesStats(null);
      setSalesStatsError('Sales statistics are unavailable.');
    } finally {
      setSalesStatsLoading(false);
    }
  }, [productId]);


  const loadWarehouseAvailability = useCallback(async () => {
    setWarehouseAvailabilityLoading(true);
    setWarehouseAvailabilityError(null);

    try {
      const response = await productsApi.getAvailabilityBatch([productId]);
      if (response.success && response.data) {
        setWarehouseAvailability(response.data.items?.[0] ?? null);
        if (response.data.invalidProductIds?.includes(productId)) {
          setWarehouseAvailabilityError("Warehouse availability rejected this product id.");
        }
      } else {
        setWarehouseAvailability(null);
        setWarehouseAvailabilityError(response.error?.message || "Warehouse availability is unavailable.");
      }
    } catch (error) {
      console.error("Failed to load warehouse availability:", error);
      setWarehouseAvailability(null);
      setWarehouseAvailabilityError("Warehouse availability is unavailable.");
    } finally {
      setWarehouseAvailabilityLoading(false);
    }
  }, [productId]);

  const loadProduct = useCallback(async () => {
    try {
      const response = await productsApi.getProduct(productId);
      if (response.success && response.data) {
        const p = response.data;
        setProduct(p);
        setFormData({
          sku: p.sku || '',
          title: p.title || '',
          description: p.description || '',
          brand: p.brand || '',
          manufacturer: p.manufacturer || '',
          ean: p.ean || '',
          weightKg: p.weightKg?.toString() || '',
          length: p.dimensionsCm?.length?.toString() || '',
          width: p.dimensionsCm?.width?.toString() || '',
          height: p.dimensionsCm?.height?.toString() || '',
          isActive: p.isActive !== false,
          resaleEnabled: p.resaleEnabled === true,
        });
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadSalesStats();
      loadWarehouseAvailability();
    }
  }, [productId, loadProduct, loadSalesStats, loadWarehouseAvailability]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditProduct) {
      alert('Only the product owner can edit this catalog product.');
      return;
    }
    setSaving(true);

    try {
      const productData: any = {
        sku: formData.sku,
        title: formData.title,
        description: formData.description || undefined,
        brand: formData.brand || undefined,
        manufacturer: formData.manufacturer || undefined,
        ean: formData.ean || undefined,
        isActive: formData.isActive,
        resaleEnabled: formData.resaleEnabled,
      };

      if (formData.weightKg) {
        productData.weightKg = parseFloat(formData.weightKg);
      }

      if (formData.length || formData.width || formData.height) {
        productData.dimensionsCm = {};
        if (formData.length) productData.dimensionsCm.length = parseFloat(formData.length);
        if (formData.width) productData.dimensionsCm.width = parseFloat(formData.width);
        if (formData.height) productData.dimensionsCm.height = parseFloat(formData.height);
      }

      const response = await productsApi.updateProduct(productId, productData);
      if (response.success) {
        router.push('/dashboard/products');
      } else {
        alert('Failed to update product');
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Product not found</h2>
        <button
          onClick={() => router.push('/dashboard/products')}
          className="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Products
        </button>
      </div>
    );
  }

  const totalSalesCount = salesStats?.totals.quantitySold ?? 0;
  const totalGrossRevenue = formatGrossSales(salesStats?.totals.grossSalesByCurrency);
  const salesUnavailableReason = salesStatsError || salesStats?.unavailableReason;
  const salesChannels = salesStats?.channels?.length
    ? salesStats.channels
    : buildFallbackSalesChannels(productId, salesUnavailableReason ? 'unavailable' : 'zero', salesUnavailableReason);
  const recentSalesHistory = salesStats?.recentHistory ?? [];
  const orderStatusRows = salesStats?.orderStatuses ?? [];
  const orderDeliveryStats = salesStats?.orderDelivery ?? null;
  const orderDeliveryUnavailableReason = orderDeliveryStats?.sourceStatus === 'unavailable'
    ? orderDeliveryStats.unavailableReason || '[MISSING: Orders stats endpoint]'
    : null;
  const orderDeliveryPanelUnavailableReason = orderDeliveryUnavailableReason || (!salesStats ? salesUnavailableReason : null);
  const lifecycleStageRows = orderDeliveryStats?.sourceStatus === 'available' ? orderDeliveryStats.lifecycleStages : [];
  const paymentStatusRows = orderDeliveryStats?.sourceStatus === 'available' ? orderDeliveryStats.paymentStatuses : [];
  const deliveryStatusRows = orderDeliveryStats?.sourceStatus === 'available' ? orderDeliveryStats.deliveryStatuses : [];
  const deliveryExceptions = orderDeliveryStats?.deliveryExceptions ?? { notReceived: 0, returned: 0, delayed: 0, unfulfilled: 0 };
  const warehouseRouteStatus = getWarehouseRouteStatus(warehouseAvailability);
  const warehouseRows = warehouseAvailability?.warehouses ?? [];
  const warehouseRoutes = warehouseAvailability?.logistics?.options ?? [];
  const canEditProduct = Boolean(
    product.ownerUserId && (product.ownerUserId === user?.id || product.ownerUserId === user?.email),
  ) || Boolean(user?.isAdmin || user?.roles?.some((role) => role.includes('catalog-microservice:admin') || role === 'global:superadmin'));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl font-extrabold mb-2">✏️ Edit Product</h1>
        <p className="text-xl text-blue-50">{product.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        {!canEditProduct && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            This product is visible for resale, but only the owner can edit the catalog record.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sku"
              required
              value={formData.sku}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Manufacturer
            </label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              EAN
            </label>
            <input
              type="text"
              name="ean"
              value={formData.ean}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.001"
              name="weightKg"
              value={formData.weightKg}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Length (cm)
            </label>
            <input
              type="number"
              step="0.1"
              name="length"
              value={formData.length}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Width (cm)
            </label>
            <input
              type="number"
              step="0.1"
              name="width"
              value={formData.width}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Height (cm)
            </label>
            <input
              type="number"
              step="0.1"
              name="height"
              value={formData.height}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-gray-700">Product is active</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                name="resaleEnabled"
                checked={formData.resaleEnabled}
                disabled={!canEditProduct}
                onChange={handleChange}
                className="mt-1 w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-800">Available for resale by other sellers</span>
                <span className="block text-sm text-gray-600">Other sellers can see this product only if they enable products from other sellers.</span>
              </span>
            </label>
          </div>
        </div>

        {/* Media Management */}
        <MediaManagement productId={productId} />

        {/* Pricing Management */}
        <PricingManagement productId={productId} />

        <ProductContentPreviewPanel product={product} />

        <MarketplaceFieldsPanel product={product} onProductUpdated={(updatedProduct) => setProduct(updatedProduct)} />

        <BazosPublishPanel productId={productId} defaultCategory={product.categories?.[0]?.name} />

        <AllegroPublishPanel productId={productId} defaultTitle={product.title} defaultDescription={product.description || ''} />

        <AukroPublishPanel productId={productId} />

        <ChannelSalesPanel productId={productId} />


        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Warehouse stock</h2>
              <p className="text-sm text-gray-600">Source of truth: Warehouse availability.</p>
              {warehouseAvailabilityError && (
                <p className="mt-2 text-sm text-amber-700">{warehouseAvailabilityError}</p>
              )}
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${warehouseRouteStatus.tone}`}>
              {warehouseAvailabilityLoading ? "Loading" : warehouseRouteStatus.label}
            </span>
          </div>

          {warehouseAvailabilityLoading ? (
            <div className="mt-5 flex min-h-[120px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase text-gray-500">Total</div>
                  <div className="text-3xl font-extrabold text-gray-900">{formatQuantity(warehouseAvailability?.totalQuantity)}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase text-gray-500">Reserved</div>
                  <div className="text-3xl font-extrabold text-gray-900">{formatQuantity(warehouseAvailability?.totalReserved)}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase text-gray-500">Available</div>
                  <div className="text-3xl font-extrabold text-gray-900">{formatQuantity(warehouseAvailability?.totalAvailable)}</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                {warehouseRouteStatus.detail}
                {warehouseAvailability?.logistics?.preferredRoute && (
                  <span> Preferred route: {warehouseAvailability.logistics.preferredRoute.replace(/_/g, " ")}.</span>
                )}
              </div>

              <div className="mt-5">
                <h3 className="font-bold text-gray-900">Warehouse rows</h3>
                {warehouseRows.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">No Warehouse rows returned for this product.</div>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                    <div className="grid grid-cols-4 bg-gray-100 px-4 py-2 text-xs font-semibold uppercase text-gray-500">
                      <div>Warehouse</div>
                      <div className="text-right">Total</div>
                      <div className="text-right">Reserved</div>
                      <div className="text-right">Available</div>
                    </div>
                    {warehouseRows.map((row) => (
                      <div key={row.warehouseId} className="grid grid-cols-4 border-t border-gray-200 px-4 py-3 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-gray-900">{row.warehouseName || row.warehouseCode || row.warehouseId}</div>
                          <div className="truncate text-xs text-gray-500">{row.warehouseType || "warehouse"}{row.supplierId ? ` / supplier ${row.supplierId}` : ""}</div>
                        </div>
                        <div className="text-right font-semibold text-gray-900">{formatQuantity(row.quantity)}</div>
                        <div className="text-right text-gray-700">{formatQuantity(row.reserved)}</div>
                        <div className="text-right font-semibold text-emerald-700">{formatQuantity(row.available)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5">
                <h3 className="font-bold text-gray-900">Route status</h3>
                {warehouseRoutes.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">No reservable logistics routes returned.</div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {warehouseRoutes.map((route) => (
                      <div key={`${route.warehouseId}-${route.routeType}-${route.priority}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{route.routeLabel || route.routeType.replace(/_/g, " ")}</div>
                            <div className="text-xs text-gray-500">{route.warehouseName || route.warehouseCode} / {route.routeType.replace(/_/g, " ")}</div>
                          </div>
                          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${isReservableRoute(route) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {isReservableRoute(route) ? "Reservable" : "Not reservable"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                          <div><span className="text-gray-500">Total</span> <span className="font-semibold text-gray-900">{formatQuantity(route.quantity)}</span></div>
                          <div><span className="text-gray-500">Reserved</span> <span className="font-semibold text-gray-900">{formatQuantity(route.reserved)}</span></div>
                          <div><span className="text-gray-500">Available</span> <span className="font-semibold text-gray-900">{formatQuantity(route.available)}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Marketplace sales</h2>
              <p className="text-sm text-gray-600">Product-specific sales, order status, and delivery signals from Orders.</p>
              {salesUnavailableReason && (
                <p className="mt-2 text-sm text-amber-700">{salesUnavailableReason}</p>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right">
              <div className="text-xs font-semibold uppercase text-gray-500">Total sold</div>
              <div className="text-3xl font-extrabold text-gray-900">{salesStatsLoading ? '...' : totalSalesCount}</div>
              <div className="text-xs text-gray-500">{salesStatsLoading ? 'Loading' : totalGrossRevenue}</div>
            </div>
          </div>

          {salesStatsLoading ? (
            <div className="mt-5 flex min-h-[120px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {salesChannels.map((stat) => (
                <div key={stat.channel} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-gray-900">{channelLabels[stat.channel] || stat.channel}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stat.status === 'unavailable' ? 'bg-amber-100 text-amber-800' : stat.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                      {stat.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Sold</div>
                      <div className="text-2xl font-extrabold text-gray-900">{stat.quantitySold}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Revenue</div>
                      <div className="text-lg font-bold text-gray-900">{stat.grossSales.toLocaleString('cs-CZ')} {stat.currency}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Orders</div>
                      <div className="text-lg font-bold text-gray-900">{stat.orderCount}</div>
                    </div>
                  </div>
                  {stat.lastOrderedAt && (
                    <div className="mt-3 text-xs text-gray-500">
                      Last order {new Date(stat.lastOrderedAt).toLocaleDateString('cs-CZ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!salesStatsLoading && (
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-bold text-gray-900">Order status</h3>
                {orderStatusRows.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-600">
                    No Orders status rows returned for this product.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {orderStatusRows.map((row) => (
                      <div key={`${row.status}-${row.currency}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                        <div>
                          <div className="font-semibold text-gray-900">{formatMetricLabel(row.status)}</div>
                          <div className="text-xs text-gray-500">{row.quantitySold} sold / {row.grossSales.toLocaleString('cs-CZ')} {row.currency}</div>
                        </div>
                        <div className="text-right font-bold text-gray-900">{row.orderCount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-bold text-gray-900">Lifecycle and payment</h3>
                {orderDeliveryPanelUnavailableReason ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {orderDeliveryPanelUnavailableReason}
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="text-xs font-semibold uppercase text-gray-500">Lifecycle</div>
                      {lifecycleStageRows.length === 0 ? (
                        <div className="mt-2 text-sm text-gray-600">No lifecycle rows returned.</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {lifecycleStageRows.map((row) => (
                            <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-gray-700">{row.label || formatMetricLabel(row.key)}</span>
                              <span className="font-bold text-gray-900">{row.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="text-xs font-semibold uppercase text-gray-500">Payment</div>
                      {paymentStatusRows.length === 0 ? (
                        <div className="mt-2 text-sm text-gray-600">No payment rows returned.</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {paymentStatusRows.map((row) => (
                            <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-gray-700">{row.label || formatMetricLabel(row.key)}</span>
                              <span className="font-bold text-gray-900">{row.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!salesStatsLoading && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-gray-900">Delivery exceptions</h3>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${orderDeliveryStats?.sourceStatus === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {orderDeliveryStats?.sourceStatus || 'unavailable'}
                </span>
              </div>
              {orderDeliveryPanelUnavailableReason ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {orderDeliveryPanelUnavailableReason}
                </div>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {deliveryExceptionKeys.map((item) => (
                      <div key={item.key} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">{item.label}</div>
                        <div className="mt-1 text-2xl font-extrabold text-gray-900">{deliveryExceptions[item.key]}</div>
                      </div>
                    ))}
                  </div>
                  {deliveryStatusRows.length > 0 && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                      <div className="text-xs font-semibold uppercase text-gray-500">Delivery status</div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {deliveryStatusRows.map((row) => (
                          <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-700">{row.label || formatMetricLabel(row.key)}</span>
                            <span className="font-bold text-gray-900">{row.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!salesStatsLoading && recentSalesHistory.length > 0 && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-bold text-gray-900">Recent sales</h3>
              <div className="mt-3 divide-y divide-gray-200">
                {recentSalesHistory.map((event, index) => (
                  <div key={`${event.channel}-${event.orderedAt || index}`} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{channelLabels[event.channel] || event.channel}</div>
                      <div className="text-gray-500">{event.orderedAt ? new Date(event.orderedAt).toLocaleDateString('cs-CZ') : 'Date unavailable'}</div>
                    </div>
                    <div className="text-gray-700 sm:text-right">
                      <div>{event.quantitySold} sold</div>
                      <div className="font-semibold">{event.grossSales.toLocaleString('cs-CZ')} {event.currency}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving || !canEditProduct}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
