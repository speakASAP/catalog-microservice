/**
 * Attributes API - Catalog Microservice
 */

import { apiClient } from './client';

export interface Attribute {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  unit?: string;
  allowedValues?: string[];
}

export const attributesApi = {
  async getAttributes() {
    return apiClient.get<Attribute[]>('/attributes');
  },

  async getAttribute(id: string) {
    return apiClient.get<Attribute>(`/attributes/${id}`);
  },

  async createAttribute(data: Partial<Attribute>) {
    return apiClient.post<Attribute>('/attributes', data);
  },

  async updateAttribute(id: string, data: Partial<Attribute>) {
    return apiClient.put<Attribute>(`/attributes/${id}`, data);
  },
};

