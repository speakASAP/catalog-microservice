import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  getHealth() {
    return {
      status: 'healthy',
      service: process.env.SERVICE_NAME || 'catalog-microservice',
      version: '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

