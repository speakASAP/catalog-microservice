'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi, buildDimensionsCmFromForm, parsePositiveMeasurement, preventNumberInputScroll } from '@/lib/api/products';
import { mediaApi } from '@/lib/api/media';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function CreateProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
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
  const [photoUrls, setPhotoUrls] = useState<string[]>(['']);
  const [videoUrl, setVideoUrl] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handlePhotoUrlChange = (index: number, value: string) => {
    setPhotoUrls((current) => current.map((url, i) => (i === index ? value : url)));
  };

  const addPhotoUrlField = () => {
    setPhotoUrls((current) => [...current, '']);
  };

  const removePhotoUrlField = (index: number) => {
    setPhotoUrls((current) => current.filter((_, i) => i !== index));
  };

  const handleImportFromUrl = async () => {
    const url = importUrl.trim();
    if (!url) {
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      const response = await productsApi.importFromUrl(url);
      if (response.success && response.data) {
        router.push(`/dashboard/products/${response.data.id}`);
      } else {
        setImportError(response.error?.message || 'Failed to import from URL');
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import from URL');
    } finally {
      setImportLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

      const weightKg = parsePositiveMeasurement(formData.weightKg);
      if (weightKg !== undefined) {
        productData.weightKg = weightKg;
      }

      const dimensionsCm = buildDimensionsCmFromForm(formData);
      if (dimensionsCm) {
        productData.dimensionsCm = dimensionsCm;
      }

      const response = await productsApi.createProduct(productData);
      if (response.success && response.data) {
        const productId = response.data.id;
        const trimmedPhotoUrls = photoUrls.map((url) => url.trim()).filter(Boolean);
        const trimmedVideoUrl = videoUrl.trim();

        await Promise.all([
          ...trimmedPhotoUrls.map((url, index) =>
            mediaApi.createMedia({
              productId,
              type: 'image',
              url,
              position: index,
              isPrimary: index === 0,
            }),
          ),
          ...(trimmedVideoUrl
            ? [
                mediaApi.createMedia({
                  productId,
                  type: 'video',
                  url: trimmedVideoUrl,
                  position: trimmedPhotoUrls.length,
                }),
              ]
            : []),
        ]);

        router.push(`/dashboard/products/${productId}`);
      } else {
        alert('Failed to create product');
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl font-extrabold mb-2">➕ Create New Product</h1>
        <p className="text-xl text-blue-50">Add a new product to the catalog</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-3 border-2 border-indigo-100">
        <h2 className="text-lg font-bold text-gray-800">Import from a marketplace link</h2>
        <p className="text-sm text-gray-600">
          Paste a listing URL (e.g. an Aukro.cz auction) to create a draft product with its
          title, description, and photos already filled in.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleImportFromUrl();
          }}
        >
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://aukro.cz/..."
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="submit"
            disabled={importLoading || !importUrl.trim()}
            className="whitespace-nowrap bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importLoading ? <LoadingSpinner size="sm" /> : 'Create draft from link'}
          </button>
        </form>
        {importError && (
          <p className="text-sm font-semibold text-red-600">{importError}</p>
        )}
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
              placeholder="PROD-001"
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
              placeholder="Product Name"
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
              placeholder="Product description..."
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
              placeholder="Brand Name"
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
              placeholder="Manufacturer Name"
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
              placeholder="1234567890123"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              name="weightKg"
              value={formData.weightKg}
              onChange={handleChange}
              onWheel={preventNumberInputScroll}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="0.5"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Length (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              name="length"
              value={formData.length}
              onChange={handleChange}
              onWheel={preventNumberInputScroll}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="10"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Width (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              name="width"
              value={formData.width}
              onChange={handleChange}
              onWheel={preventNumberInputScroll}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="10"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Height (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              name="height"
              value={formData.height}
              onChange={handleChange}
              onWheel={preventNumberInputScroll}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="10"
            />
          </div>

          <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              New products always start as a Draft, regardless of this setting.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Add photo/video links below, then activate the product from the product page once it&apos;s ready to sell.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Photo links
            </label>
            <div className="space-y-3">
              {photoUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handlePhotoUrlChange(index, e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="https://example.com/photo.jpg"
                  />
                  {photoUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhotoUrlField(index)}
                      className="px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                      aria-label="Remove photo link"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addPhotoUrlField}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-all"
              >
                + Add another photo link
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Video link
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="https://example.com/video.mp4"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                name="resaleEnabled"
                checked={formData.resaleEnabled}
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

        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Create Product'}
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
