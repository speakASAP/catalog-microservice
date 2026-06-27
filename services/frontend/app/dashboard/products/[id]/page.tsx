'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { productsApi, Product, ProductSalesChannel, ProductSalesStatistics } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';
import MediaManagement from '@/components/MediaManagement';
import PricingManagement from '@/components/PricingManagement';
import BazosPublishPanel from '@/components/BazosPublishPanel';
import AllegroPublishPanel from '@/components/AllegroPublishPanel';
import ChannelSalesPanel from '@/components/ChannelSalesPanel';


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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [salesStats, setSalesStats] = useState<ProductSalesStatistics | null>(null);
  const [salesStatsLoading, setSalesStatsLoading] = useState(false);
  const [salesStatsError, setSalesStatsError] = useState<string | null>(null);
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
    }
  }, [productId, loadProduct, loadSalesStats]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl font-extrabold mb-2">✏️ Edit Product</h1>
        <p className="text-xl text-blue-50">{product.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
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
        </div>

        {/* Media Management */}
        <MediaManagement productId={productId} />

        {/* Pricing Management */}
        <PricingManagement productId={productId} />

        <BazosPublishPanel productId={productId} defaultCategory={product.categories?.[0]?.name} />

        <AllegroPublishPanel productId={productId} defaultTitle={product.title} defaultDescription={product.description || ''} />

        <ChannelSalesPanel productId={productId} />

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Marketplace sales</h2>
              <p className="text-sm text-gray-600">Product-specific sales totals from Orders.</p>
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
            disabled={saving}
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

