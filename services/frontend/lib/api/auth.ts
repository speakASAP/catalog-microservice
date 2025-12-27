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

// Get API base URL - use catalog API which proxies to auth-microservice
const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker network URL
    return process.env.API_URL || 'http://catalog-microservice:3200/api';
  }
  // Client-side: use external URL (already includes /api)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://catalog.statex.cz/api';
  // Remove /api if present since we'll add it in the path
  return baseUrl.replace(/\/api$/, '');
};

const API_BASE_URL = getApiBaseUrl();

export const authApi = {
  async login(credentials: LoginCredentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      // Handle network errors (including SSL certificate errors)
      if (!response.ok && response.status === 0) {
        return { 
          success: false, 
          error: 'Network error: Unable to connect to authentication service. Please check your connection or contact support.' 
        };
      }

      const data = await response.json();

      // auth-microservice returns { user, accessToken, refreshToken } directly
      if (response.ok && data.user && data.accessToken) {
        apiClient.setToken(data.accessToken);
        return { success: true, data: { user: data.user, token: data.accessToken } };
      }

      // Handle auth-microservice error responses
      if (data.statusCode === 401 || data.message) {
        return { success: false, error: data.message || 'Invalid credentials' };
      }

      return { success: false, error: data.message || data.error || 'Login failed' };
    } catch (error: any) {
      // Handle fetch errors (network, SSL, etc.)
      if (error.message?.includes('CERT') || error.message?.includes('certificate')) {
        return { 
          success: false, 
          error: 'SSL certificate error. Please contact support to fix the authentication service certificate.' 
        };
      }
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        return { 
          success: false, 
          error: 'Network error: Unable to connect to authentication service.' 
        };
      }
      return { success: false, error: error.message || 'An unexpected error occurred during login' };
    }
  },

  async register(data: RegisterData) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    // auth-microservice returns { user, accessToken, refreshToken } directly
    if (response.ok && result.user && result.accessToken) {
      apiClient.setToken(result.accessToken);
      return { success: true, data: { user: result.user, token: result.accessToken } };
    }

    return { success: false, error: result.message || result.error || 'Registration failed' };
  },

  async getProfile() {
    // Use catalog API which proxies to auth-microservice
    // The proxy returns { user: {...} } directly from auth-microservice
    const token = apiClient.getToken();
    if (!token) {
      return { success: false, error: 'No token available' };
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to get profile' };
    }

    const data = await response.json();
    if (data.user) {
      return { success: true, data: data.user };
    }

    return { success: false, error: 'Invalid profile response' };
  },

  async updateProfile(data: Partial<User>) {
    // Note: Update profile endpoint not yet implemented in proxy
    // For now, return error or implement if needed
    return { success: false, error: 'Update profile not yet implemented' };
  },

  logout() {
    apiClient.setToken(null);
  },
};

