/**
 * Categories API - Catalog Microservice
 */

import { apiClient } from './client';

export interface Category {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
  path?: string;
  level?: number;
  children?: Category[];
}

export const categoriesApi = {
  async getCategories() {
    return apiClient.get<Category[]>('/categories');
  },

  async getCategoryTree() {
    return apiClient.get<Category[]>('/categories/tree');
  },

  async getCategory(id: string) {
    return apiClient.get<Category>(`/categories/${id}`);
  },

  async createCategory(data: Partial<Category>) {
    return apiClient.post<Category>('/categories', data);
  },

  async updateCategory(id: string, data: Partial<Category>) {
    return apiClient.put<Category>(`/categories/${id}`, data);
  },

  async deleteCategory(id: string) {
    return apiClient.delete(`/categories/${id}`);
  },
};

