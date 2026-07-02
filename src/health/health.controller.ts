import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Health check endpoint
   * GET /health (no api prefix)
   */
  @Get('health')
  async getHealth() {
    return this.healthService.getHealth();
  }

  /**
   * Readiness check
   * GET /ready
   */
  @Get('ready')
  async getReady() {
    return this.healthService.getReady();
  }
}

