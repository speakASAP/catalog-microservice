/**
 * Auth API - Uses shared auth-microservice
 */

import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  roles?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Get auth service URL from environment
const getAuthServiceUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker network URL
    return (process.env?.AUTH_SERVICE_URL as string | undefined) || 'http://auth-microservice:3370';
  }
  // Client-side: use external URL
  return (process.env?.NEXT_PUBLIC_AUTH_SERVICE_URL as string | undefined) || 'https://auth.statex.cz';
};

const AUTH_SERVICE_URL = getAuthServiceUrl();

export const authApi = {
  async login(credentials: LoginCredentials) {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (response.ok && data.success && data.data) {
      apiClient.setToken(data.data.token);
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error };
  },

  async register(data: RegisterData) {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok && result.success && result.data) {
      apiClient.setToken(result.data.token);
      return { success: true, data: result.data };
    }

    return { success: false, error: result.error };
  },

  async getProfile() {
    return apiClient.get<User>(`${AUTH_SERVICE_URL}/api/users/profile`);
  },

  async updateProfile(data: Partial<User>) {
    return apiClient.put<User>(`${AUTH_SERVICE_URL}/api/users/profile`, data);
  },

  logout() {
    apiClient.setToken(null);
  },
};

