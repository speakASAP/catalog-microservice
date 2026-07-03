'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { attributesApi, Attribute } from '@/lib/api/attributes';
import LoadingSpinner from '@/components/LoadingSpinner';

type AttributeType = Attribute['type'];

export default function EditAttributePage() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const attributeId = useMemo(() => {
    if (Array.isArray(params.id)) {
      return params.id[0] || '';
    }
    return params.id || '';
  }, [params.id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as AttributeType,
    unit: '',
    allowedValues: '',
  });

  useEffect(() => {
    const loadAttribute = async () => {
      if (!attributeId) {
        setError('Attribute id is missing');
        setLoading(false);
        return;
      }

      try {
        const response = await attributesApi.getAttribute(attributeId);
        if (response.success && response.data) {
          setFormData({
            name: response.data.name || '',
            type: response.data.type || 'text',
            unit: response.data.unit || '',
            allowedValues: response.data.allowedValues?.join(', ') || '',
          });
        } else {
          setError(response.error?.message || 'Failed to load attribute');
        }
      } catch (loadError) {
        console.error('Failed to load attribute:', loadError);
        setError('Failed to load attribute');
      } finally {
        setLoading(false);
      }
    };

    loadAttribute();
  }, [attributeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const isSelectType = formData.type === 'select' || formData.type === 'multiselect';
      const attributeData: Record<string, string | string[] | null> = {
        name: formData.name,
        type: formData.type,
        unit: formData.unit.trim() || null,
        allowedValues: isSelectType
          ? formData.allowedValues.split(',').map((value) => value.trim()).filter(Boolean)
          : null,
      };

      const response = await attributesApi.updateAttribute(attributeId, attributeData as Partial<Attribute>);
      if (response.success) {
        router.push('/dashboard/attributes');
      } else {
        setError(response.error?.message || 'Failed to update attribute');
      }
    } catch (saveError) {
      console.error('Failed to update attribute:', saveError);
      setError('Failed to update attribute');
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

  if (error && !formData.name) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-red-100">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Attribute unavailable</h1>
          <p className="text-red-600 mb-6">{error}</p>
          <Link
            href="/dashboard/attributes"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            Back to Attributes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl font-extrabold mb-2">✏️ Edit Attribute</h1>
        <p className="text-xl text-blue-50">Update attribute definition</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

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
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <LoadingSpinner size="sm" /> : 'Save Attribute'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/attributes')}
            className="px-8 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
