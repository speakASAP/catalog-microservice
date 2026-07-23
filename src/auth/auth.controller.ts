import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Header,
  HttpException,
  HttpCode,
  HttpStatus,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Auth Controller - Proxy endpoints for auth-microservice
 * Avoids CORS issues by proxying through catalog backend
 *
 * Responses here are per-user and must never be cached. Without no-store,
 * Express attaches a weak ETag, the browser revalidates with If-None-Match
 * and gets a bodyless 304 - which the frontend read as "profile fetch
 * failed", cleared the token and bounced the user back to /login forever.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() credentials: { email: string; password: string }) {
    this.logger.log('POST /api/auth/login', 'AuthController');
    try {
      const result = await this.authService.login(credentials);
      return result;
    } catch (error: any) {
      this.logger.error(
        `Login error: ${error.message}`,
        error.stack,
        'AuthController',
      );
      // Return auth-microservice error response
      const statusCode = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        statusCode,
        message: error.response?.data?.message || error.message || 'Login failed',
      };
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body()
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  ) {
    this.logger.log('POST /api/auth/register', 'AuthController');
    try {
      const result = await this.authService.register(data);
      return result;
    } catch (error: any) {
      this.logger.error(
        `Register error: ${error.message}`,
        error.stack,
        'AuthController',
      );
      const statusCode = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        statusCode,
        message: error.response?.data?.message || error.message || 'Registration failed',
      };
    }
  }

  @Get('profile')
  @Header('Cache-Control', 'no-store')
  async getProfile(@Headers('authorization') authorization: string) {
    this.logger.log('GET /api/auth/profile', 'AuthController');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authorization.substring(7);
    try {
      const result = await this.authService.getProfile(token);
      return result;
    } catch (error: any) {
      this.logger.error(
        `GetProfile error: ${error.message}`,
        error.stack,
        'AuthController',
      );
      const statusCode = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          statusCode,
          message: error.response?.data?.message || error.message || 'Failed to get profile',
        },
        statusCode,
      );
    }
  }

  @Get('admin/users')
  @Header('Cache-Control', 'no-store')
  async getAdminUsers(
    @Headers('authorization') authorization: string,
    @Query('limit') limit = '100',
    @Query('offset') offset = '0',
  ) {
    this.logger.log('GET /api/auth/admin/users', 'AuthController');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authorization.substring(7);
    return this.authService.getAdminUsers(token, limit, offset);
  }

}




