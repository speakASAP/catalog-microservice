import { ApiResponse } from './client';

const getSuppliersApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.SUPPLIERS_API_URL || 'http://suppliers-microservice:3202/api';
  }
  return process.env.NEXT_PUBLIC_SUPPLIERS_API_URL || 'https://suppliers.alfares.cz/api';
};

export type SupplierApiType = 'rest' | 'xml' | 'csv' | 'ftp';

export interface Supplier {
  id: string;
  name: string;
  code: string;
  apiType: SupplierApiType;
  apiUrl?: string | null;
  syncSchedule?: string | null;
  isActive: boolean;
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierPayload {
  name: string;
  code: string;
  apiType: SupplierApiType;
  apiUrl?: string;
  syncSchedule?: string;
  isActive?: boolean;
}

class SuppliersApiClient {
  private baseUrl = getSuppliersApiBaseUrl();

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
      const text = await response.text();
      const data = text ? JSON.parse(text) : { success: response.ok };
      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Supplier request failed');
      }
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REQUEST_ERROR',
          message: error instanceof Error ? error.message : 'Supplier service is unavailable',
        },
      };
    }
  }

  list() {
    return this.request<Supplier[]>('/suppliers');
  }

  create(payload: CreateSupplierPayload) {
    return this.request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const suppliersApi = new SuppliersApiClient();
