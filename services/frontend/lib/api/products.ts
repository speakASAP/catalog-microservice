/**
 * Products API - Catalog Microservice
 */

import { apiClient } from './client';

export interface Product {
  id: string;
  sku: string;
  title: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  ean?: string;
  weightKg?: number;
  dimensionsCm?: {
    length?: number;
    width?: number;
    height?: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const productsApi = {
  async getProducts(query?: ProductQuery) {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const queryString = params.toString();
    return apiClient.get<PaginatedResponse<Product>>(`/products${queryString ? `?${queryString}` : ''}`);
  },

  async getProduct(id: string) {
    return apiClient.get<Product>(`/products/${id}`);
  },

  async getProductBySku(sku: string) {
    return apiClient.get<Product>(`/products/sku/${sku}`);
  },

  async createProduct(data: Partial<Product>) {
    return apiClient.post<Product>('/products', data);
  },

  async updateProduct(id: string, data: Partial<Product>) {
    return apiClient.put<Product>(`/products/${id}`, data);
  },

  async deleteProduct(id: string) {
    return apiClient.delete(`/products/${id}`);
  },

  async hardDeleteProduct(id: string) {
    return apiClient.delete(`/products/${id}/hard`);
  },
};

