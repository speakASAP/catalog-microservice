'use client';

/**
 * Media Management Component
 * Manages product media (images, videos, documents)
 */

import { useState, useEffect, useRef } from 'react';
import { mediaApi, Media } from '@/lib/api/media';
import LoadingSpinner from './LoadingSpinner';

interface MediaManagementProps {
  productId: string;
}

export default function MediaManagement({ productId }: MediaManagementProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaAlt, setNewMediaAlt] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video' | 'document'>('image');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleAddMedia = async () => {
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

  const handleUploadFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (selectedFiles.length === 0) {
      alert('Select one or more image files to upload');
      return;
    }

    setUploading(true);
    setUploadMessage(`Uploading ${selectedFiles.length} image${selectedFiles.length === 1 ? '' : 's'}...`);

    let uploaded = 0;
    let failed = 0;
    for (const file of selectedFiles) {
      try {
        const response = await mediaApi.uploadMedia(file, {
          productId,
          altText: file.name,
          position: media.length + uploaded,
          isPrimary: media.length === 0 && uploaded === 0,
        });

        if (response.success) {
          uploaded += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        console.error('Failed to upload media:', error);
        failed += 1;
      }
    }

    setUploadMessage(
      failed > 0
        ? `Uploaded ${uploaded}; ${failed} failed`
        : `Uploaded ${uploaded} image${uploaded === 1 ? '' : 's'}`,
    );
    await loadMedia();
    setUploading(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const setDirectoryInputRef = (node: HTMLInputElement | null) => {
    folderInputRef.current = node;
    if (node) {
      node.setAttribute('webkitdirectory', '');
      node.setAttribute('directory', '');
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

        {/* Upload Media */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`mb-6 rounded-lg border-2 border-dashed p-6 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={setDirectoryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
            📤
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Drop product pictures here
          </p>
          <p className="mt-1 text-sm text-gray-500">
            JPG, PNG, WebP, GIF, or AVIF up to 25 MB each
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Choose Files
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Choose Folder
            </button>
          </div>
          {(uploading || uploadMessage) && (
            <div className="mt-3 flex items-center justify-center text-sm font-medium text-gray-600">
              {uploading ? <LoadingSpinner size="sm" /> : uploadMessage}
            </div>
          )}
        </div>

        {/* Add New Media URL */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
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
            type="button"
            onClick={handleAddMedia}
            disabled={adding || !newMediaUrl.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? <LoadingSpinner size="sm" /> : '➕ Add Media'}
          </button>
        </div>

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
                        type="button"
                        onClick={() => handleSetPrimary(item.id)}
                        className="flex-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-all"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
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
