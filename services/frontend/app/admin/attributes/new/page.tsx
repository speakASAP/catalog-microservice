'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { attributesApi } from '@/lib/api/attributes';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function CreateAttributePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as 'text' | 'number' | 'select' | 'multiselect',
    unit: '',
    allowedValues: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const attributeData: any = {
        name: formData.name,
        type: formData.type,
        unit: formData.unit || undefined,
      };

      if ((formData.type === 'select' || formData.type === 'multiselect') && formData.allowedValues) {
        attributeData.allowedValues = formData.allowedValues.split(',').map((v) => v.trim()).filter(Boolean);
      }

      const response = await attributesApi.createAttribute(attributeData);
      if (response.success) {
        router.push('/admin/attributes');
      } else {
        alert('Failed to create attribute');
      }
    } catch (error) {
      console.error('Failed to create attribute:', error);
      alert('Failed to create attribute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl font-extrabold mb-2">➕ Create New Attribute</h1>
        <p className="text-xl text-blue-50">Add a new attribute definition</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Color, Size, Material, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            required
            value={formData.type}
            onChange={handleChange}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select (Single)</option>
            <option value="multiselect">Multi-Select</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Unit
          </label>
          <input
            type="text"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="cm, kg, etc."
          />
        </div>

        {(formData.type === 'select' || formData.type === 'multiselect') && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Allowed Values <span className="text-red-500">*</span>
            </label>
            <textarea
              name="allowedValues"
              required
              value={formData.allowedValues}
              onChange={handleChange}
              rows={4}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Value1, Value2, Value3 (comma-separated)"
            />
            <p className="text-xs text-gray-500 mt-1">Enter values separated by commas</p>
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Create Attribute'}
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

