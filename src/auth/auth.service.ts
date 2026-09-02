import { ForbiddenException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from './catalog-auth.guard';

/**
 * Auth Service - Proxies requests to auth-microservice
 */
@Injectable()
export class AuthService {
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    // Use internal Docker network URL for server-to-server communication
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370';
  }

  async login(credentials: { email: string; password: string }) {
    this.logger.log('Proxying login request to auth-microservice', 'AuthService');
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/auth/login`,
          credentials,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Login proxy error: ${error.message}`,
        error.stack,
        'AuthService',
      );
      throw error;
    }
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    this.logger.log('Proxying register request to auth-microservice', 'AuthService');
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/auth/register`,
          data,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Register proxy error: ${error.message}`,
        error.stack,
        'AuthService',
      );
      throw error;
    }
  }

  async getProfile(token: string) {
    this.logger.log('Proxying getProfile request to auth-microservice', 'AuthService');
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `GetProfile proxy error: ${error.message}`,
        error.stack,
        'AuthService',
      );
      throw error;
    }
  }

  async getAdminUsers(token: string, limit = '100', offset = '0') {
    const profile = await this.getProfile(token);
    // Authorize on roles, not identity. This used to compare the caller's email
    // against a single hardcoded address, which meant admin access was tied to
    // one shared account and could not be granted to anyone else, or revoked
    // without a redeploy. CatalogAuthGuard.WRITE_ROLES is the same set every
    // other catalog admin surface uses.
    const roles: string[] = Array.isArray(profile?.user?.roles)
      ? profile.user.roles
      : Array.isArray(profile?.roles)
        ? profile.roles
        : [];
    const hasAdminRole = roles.some((role) =>
      CatalogAuthGuard.WRITE_ROLES.includes(String(role)),
    );
    if (!hasAdminRole) {
      throw new ForbiddenException('Catalog admin access requires an admin role');
    }

    const params = new URLSearchParams({
      limit,
      offset,
    });

    this.logger.log('Proxying admin user list request to auth-microservice', 'AuthService');
    const response = await firstValueFrom(
      this.httpService.get(`${this.authServiceUrl}/auth/admin/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }),
    );
    return response.data;
  }

}

