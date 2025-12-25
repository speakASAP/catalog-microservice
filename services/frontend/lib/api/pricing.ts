/**
 * Pricing API - Catalog Microservice
 */

import { apiClient } from './client';

export interface ProductPricing {
  id: string;
  productId: string;
  basePrice: number;
  currency: string;
  costPrice?: number;
  marginPercent?: number;
  salePrice?: number;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  priceType: string;
  createdAt: string;
  updatedAt: string;
}

export const pricingApi = {
  async getPricingByProduct(productId: string) {
    return apiClient.get<ProductPricing[]>(`/pricing/product/${productId}`);
  },

  async getCurrentPrice(productId: string) {
    return apiClient.get<ProductPricing>(`/pricing/product/${productId}/current`);
  },

  async createPricing(data: Partial<ProductPricing>) {
    return apiClient.post<ProductPricing>('/pricing', data);
  },

  async updatePricing(id: string, data: Partial<ProductPricing>) {
    return apiClient.put<ProductPricing>(`/pricing/${id}`, data);
  },

  async deletePricing(id: string) {
    return apiClient.delete(`/pricing/${id}`);
  },
};

