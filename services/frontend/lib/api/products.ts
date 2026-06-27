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
  categories?: Array<{ id: string; name: string }>;
}

export interface BazosIdentitySummary {
  id: string;
  displayName?: string | null;
  contactName?: string | null;
  defaultLocation?: string | null;
  status?: string | null;
  reviewState?: string | null;
  sessionState?: string | null;
  activeAdCount?: number | null;
  verificationExpiresAt?: string | null;
  nextPublishNotBefore?: string | null;
  canSell: boolean;
  blockingReasons: string[];
}

export interface BazosAccountStatus {
  connected: boolean;
  active: boolean;
  canSell: boolean;
  authority: 'bazos';
  message: string;
  selectedIdentity: BazosIdentitySummary | null;
  identities: BazosIdentitySummary[];
  nextAction: string;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
}

export interface BazosSellActionResponse {
  success: boolean;
  action: string;
  productId: string;
  authority: 'bazos';
  policyAuthority: 'bazos';
  publishAuthority: 'bazos';
  draft?: any;
  identity?: any;
  categoryMapping?: any;
  policyStatus?: any;
  requiresConfirmation?: boolean;
  canQueueAfterConfirmation?: boolean;
  requiresHumanAction?: any;
  nextAction?: string;
  message?: string;
  reason?: string;
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

export interface BazosListingStatus {
  publishedOnBasus: boolean;
  listingUrl?: string | null;
  expiresAt?: string | null;
  draft?: {
    id?: string;
    publishStatus?: string;
    bazosAdId?: string | null;
    listingUrl?: string | null;
    publishedOnBasus?: boolean;
    expiresAt?: string | null;
  } | null;
  identity?: {
    displayName?: string | null;
    contactName?: string | null;
    defaultLocation?: string | null;
  } | null;
  requiresHumanAction?: {
    required?: boolean;
    reason?: string | null;
  };
  nextAction?: string;
}


export interface ProductSalesChannel {
  productId: string;
  channel: string;
  currency: string;
  orderCount: number;
  quantitySold: number;
  grossSales: number;
  lastOrderedAt: string | null;
  status: 'available' | 'zero' | 'unavailable';
  unavailableReason?: string;
}

export interface ProductSalesHistoryEvent {
  channel: string;
  orderedAt: string | null;
  currency: string;
  quantitySold: number;
  grossSales: number;
  status: string | null;
}

export interface ProductSalesStatistics {
  productId: string;
  source: 'orders';
  sourceStatus: 'available' | 'unavailable';
  allowedChannels: string[];
  currencyStrategy: string;
  conversion: string;
  totals: {
    orderCount: number;
    quantitySold: number;
    grossSalesByCurrency: Array<{ currency: string; amount: number }>;
  };
  channels: ProductSalesChannel[];
  recentHistory: ProductSalesHistoryEvent[];
  unavailableReason?: string;
}

export const productsApi = {
  async getProducts(query?: ProductQuery) {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const queryString = params.toString();
    return apiClient.get<Product[] | PaginatedResponse<Product>>(`/products${queryString ? `?${queryString}` : ''}`);
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


  async getSalesStatistics(id: string) {
    return apiClient.get<ProductSalesStatistics>(`/products/${id}/sales-statistics`);
  },

  async getBazosStatus(id: string) {
    return apiClient.get<BazosListingStatus>(`/products/${id}/bazos-status`);
  },

  async getBazosAccountStatus() {
    return apiClient.get<BazosAccountStatus>('/products/bazos/account-status');
  },

  async sellOnBazos(id: string, data: { identityId: string; category: string; location?: string; useCallerBazosIdentity?: boolean }) {
    return apiClient.post<BazosSellActionResponse>(`/products/${id}/sell-on-bazos`, data);
  },


  async sellOnAllegro(id: string, data: { categoryId?: string; quantity?: number; forceNewDraft?: boolean } = {}) {
    return apiClient.post(`/products/${id}/sell-on-allegro`, data);
  },

  async getFlipFlopStatus(id: string) {
    return apiClient.get(`/products/${id}/flipflop-status`);
  },

  async sellOnFlipFlop(id: string) {
    return apiClient.post(`/products/${id}/sell-on-flipflop`, {});
  },

  async deleteProduct(id: string) {
    return apiClient.delete(`/products/${id}`);
  },

  async hardDeleteProduct(id: string) {
    return apiClient.delete(`/products/${id}/hard`);
  },
};
