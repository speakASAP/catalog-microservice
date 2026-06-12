/**
 * Media API - Catalog Microservice
 */

import { apiClient } from './client';

export interface Media {
  id: string;
  productId: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  title?: string;
  position: number;
  isPrimary: boolean;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    mimeType?: string;
    duration?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const mediaApi = {
  async getMediaByProduct(productId: string) {
    return apiClient.get<Media[]>(`/media/product/${productId}`);
  },

  async createMedia(data: Partial<Media>) {
    return apiClient.post<Media>('/media', data);
  },

  async uploadMedia(file: File, data: {
    productId: string;
    altText?: string;
    position?: number;
    isPrimary?: boolean;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', data.productId);
    if (data.altText) {
      formData.append('altText', data.altText);
    }
    if (typeof data.position === 'number') {
      formData.append('position', String(data.position));
    }
    if (data.isPrimary) {
      formData.append('isPrimary', 'true');
    }

    return apiClient.postForm<Media>('/media/upload', formData);
  },

  async updateMedia(id: string, data: Partial<Media>) {
    return apiClient.put<Media>(`/media/${id}`, data);
  },

  async setPrimaryMedia(id: string) {
    return apiClient.put<Media>(`/media/${id}/primary`);
  },

  async deleteMedia(id: string) {
    return apiClient.delete(`/media/${id}`);
  },
};
