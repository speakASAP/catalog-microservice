'use client';

/**
 * Media Management Component
 * Manages product media (images, videos, documents)
 */

import { useState, useEffect } from 'react';
import { mediaApi, Media } from '@/lib/api/media';
import LoadingSpinner from './LoadingSpinner';

interface MediaManagementProps {
  productId: string;
}

export default function MediaManagement({ productId }: MediaManagementProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaAlt, setNewMediaAlt] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video' | 'document'>('image');

  useEffect(() => {
    loadMedia();
  }, [productId]);

  const loadMedia = async () => {
    try {
      const response = await mediaApi.getMediaByProduct(productId);
      if (response.success && response.data) {
        setMedia(response.data.sort((a, b) => a.position - b.position));
      }
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl.trim()) return;

    setAdding(true);
    try {
      const response = await mediaApi.createMedia({
        productId,
        type: newMediaType,
        url: newMediaUrl.trim(),
        altText: newMediaAlt.trim() || undefined,
        position: media.length,
        isPrimary: media.length === 0, // First media is primary by default
      });

      if (response.success) {
        setNewMediaUrl('');
        setNewMediaAlt('');
        loadMedia();
      } else {
        alert('Failed to add media');
      }
    } catch (error) {
      console.error('Failed to add media:', error);
      alert('Failed to add media');
    } finally {
      setAdding(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await mediaApi.setPrimaryMedia(id);
      if (response.success) {
        loadMedia();
      } else {
        alert('Failed to set primary media');
      }
    } catch (error) {
      console.error('Failed to set primary media:', error);
      alert('Failed to set primary media');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) {
      return;
    }

    try {
      const response = await mediaApi.deleteMedia(id);
      if (response.success) {
        loadMedia();
      } else {
        alert('Failed to delete media');
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert('Failed to delete media');
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
        <h3 className="text-xl font-bold text-gray-900 mb-4">📸 Media Management</h3>

        {/* Add New Media Form */}
        <form onSubmit={handleAddMedia} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type
              </label>
              <select
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value as 'image' | 'video' | 'document')}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alt Text
              </label>
              <input
                type="text"
                value={newMediaAlt}
                onChange={(e) => setNewMediaAlt(e.target.value)}
                placeholder="Image description"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={adding || !newMediaUrl.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? <LoadingSpinner size="sm" /> : '➕ Add Media'}
          </button>
        </form>

        {/* Media List */}
        {media.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className={`relative border-2 rounded-lg overflow-hidden ${
                  item.isPrimary ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.altText || item.title || 'Product media'}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    <span className="text-4xl">
                      {item.type === 'video' ? '🎥' : '📄'}
                    </span>
                  </div>
                )}
                {item.isPrimary && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                    Primary
                  </div>
                )}
                <div className="p-2 bg-white">
                  <p className="text-xs text-gray-600 truncate">{item.altText || item.title || 'No description'}</p>
                  <div className="flex gap-2 mt-2">
                    {!item.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(item.id)}
                        className="flex-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-all"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📸</div>
            <p>No media added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

