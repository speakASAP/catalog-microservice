'use client';

/**
 * Pricing Management Component
 * Manages product pricing with validity periods
 */

import { useState, useEffect } from 'react';
import { pricingApi, ProductPricing } from '@/lib/api/pricing';
import LoadingSpinner from './LoadingSpinner';

interface PricingManagementProps {
  productId: string;
}

export default function PricingManagement({ productId }: PricingManagementProps) {
  const [pricing, setPricing] = useState<ProductPricing[]>([]);
  const [currentPrice, setCurrentPrice] = useState<ProductPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    basePrice: '',
    currency: 'CZK',
    costPrice: '',
    marginPercent: '',
    salePrice: '',
    priceType: 'regular',
    validFrom: '',
    validTo: '',
  });

  useEffect(() => {
    loadPricing();
    loadCurrentPrice();
  }, [productId]);

  const loadPricing = async () => {
    try {
      const response = await pricingApi.getPricingByProduct(productId);
      if (response.success && response.data) {
        setPricing(response.data);
      }
    } catch (error) {
      console.error('Failed to load pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPrice = async () => {
    try {
      const response = await pricingApi.getCurrentPrice(productId);
      if (response.success && response.data) {
        setCurrentPrice(response.data);
      }
    } catch (error) {
      console.error('Failed to load current price:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.basePrice) return;

    setAdding(true);
    try {
      const pricingData: any = {
        productId,
        basePrice: parseFloat(formData.basePrice),
        currency: formData.currency,
        priceType: formData.priceType,
        isActive: true,
      };

      if (formData.costPrice) {
        pricingData.costPrice = parseFloat(formData.costPrice);
      }

      if (formData.marginPercent) {
        pricingData.marginPercent = parseFloat(formData.marginPercent);
      }

      if (formData.salePrice) {
        pricingData.salePrice = parseFloat(formData.salePrice);
      }

      if (formData.validFrom) {
        pricingData.validFrom = new Date(formData.validFrom).toISOString();
      }

      if (formData.validTo) {
        pricingData.validTo = new Date(formData.validTo).toISOString();
      }

      const response = await pricingApi.createPricing(pricingData);
      if (response.success) {
        setFormData({
          basePrice: '',
          currency: 'CZK',
          costPrice: '',
          marginPercent: '',
          salePrice: '',
          priceType: 'regular',
          validFrom: '',
          validTo: '',
        });
        setShowForm(false);
        loadPricing();
        loadCurrentPrice();
      } else {
        alert('Failed to create pricing');
      }
    } catch (error) {
      console.error('Failed to create pricing:', error);
      alert('Failed to create pricing');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing?')) {
      return;
    }

    try {
      const response = await pricingApi.deletePricing(id);
      if (response.success) {
        loadPricing();
        loadCurrentPrice();
      } else {
        alert('Failed to delete pricing');
      }
    } catch (error) {
      console.error('Failed to delete pricing:', error);
      alert('Failed to delete pricing');
    }
  };

  const calculateMargin = () => {
    if (formData.basePrice && formData.costPrice) {
      const base = parseFloat(formData.basePrice);
      const cost = parseFloat(formData.costPrice);
      if (cost > 0) {
        const margin = ((base - cost) / cost) * 100;
        setFormData({ ...formData, marginPercent: margin.toFixed(2) });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">💰 Pricing Management</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              ➕ Add Pricing
            </button>
          )}
        </div>

        {/* Current Price Display */}
        {currentPrice && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-gray-600">Current Active Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: currentPrice.currency,
                  }).format(currentPrice.basePrice)}
                </p>
                {currentPrice.salePrice && (
                  <p className="text-lg text-red-600 line-through">
                    {new Intl.NumberFormat('cs-CZ', {
                      style: 'currency',
                      currency: currentPrice.currency,
                    }).format(currentPrice.salePrice)}
                  </p>
                )}
              </div>
              <div className="text-right">
                {currentPrice.costPrice && (
                  <p className="text-sm text-gray-600">
                    Cost: {new Intl.NumberFormat('cs-CZ', {
                      style: 'currency',
                      currency: currentPrice.currency,
                    }).format(currentPrice.costPrice)}
                  </p>
                )}
                {currentPrice.marginPercent && (
                  <p className="text-sm text-gray-600">
                    Margin: {currentPrice.marginPercent}%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Pricing Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Base Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="CZK">CZK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="PLN">PLN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cost Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => {
                    setFormData({ ...formData, costPrice: e.target.value });
                    setTimeout(calculateMargin, 100);
                  }}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Margin %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.marginPercent}
                  onChange={(e) => setFormData({ ...formData, marginPercent: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sale Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price Type
                </label>
                <select
                  value={formData.priceType}
                  onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="regular">Regular</option>
                  <option value="sale">Sale</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="retail">Retail</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valid From
                </label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valid To
                </label>
                <input
                  type="datetime-local"
                  value={formData.validTo}
                  onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={adding || !formData.basePrice}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? <LoadingSpinner size="sm" /> : '💾 Save Pricing'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    basePrice: '',
                    currency: 'CZK',
                    costPrice: '',
                    marginPercent: '',
                    salePrice: '',
                    priceType: 'regular',
                    validFrom: '',
                    validTo: '',
                  });
                }}
                className="px-6 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Pricing History */}
        {pricing.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Pricing History</h4>
            <div className="space-y-2">
              {pricing.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 ${
                    item.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-gray-900">
                          {new Intl.NumberFormat('cs-CZ', {
                            style: 'currency',
                            currency: item.currency,
                          }).format(item.basePrice)}
                        </span>
                        {item.salePrice && (
                          <span className="text-lg text-red-600 line-through">
                            {new Intl.NumberFormat('cs-CZ', {
                              style: 'currency',
                              currency: item.currency,
                            }).format(item.salePrice)}
                          </span>
                        )}
                        {item.isActive && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="capitalize">{item.priceType}</span>
                        {item.costPrice && (
                          <> • Cost: {new Intl.NumberFormat('cs-CZ', {
                            style: 'currency',
                            currency: item.currency,
                          }).format(item.costPrice)}</>
                        )}
                        {item.marginPercent && (
                          <> • Margin: {item.marginPercent}%</>
                        )}
                      </div>
                      {(item.validFrom || item.validTo) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.validFrom && `From: ${new Date(item.validFrom).toLocaleDateString()}`}
                          {item.validFrom && item.validTo && ' • '}
                          {item.validTo && `To: ${new Date(item.validTo).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-all"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pricing.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💰</div>
            <p>No pricing configured yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

