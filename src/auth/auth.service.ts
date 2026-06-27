import { ForbiddenException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

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
    const email = profile?.user?.email || profile?.email;
    if (String(email || '').trim().toLowerCase() !== 'test@example.com') {
      throw new ForbiddenException('Catalog admin access is limited to test@example.com');
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

