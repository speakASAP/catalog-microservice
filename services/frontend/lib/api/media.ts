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

