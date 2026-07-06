import { Controller, Get } from "@nestjs/common";
import { BusinessHealthService } from "./business-health.service";

@Controller("business-health")
export class BusinessHealthController {
  constructor(private readonly businessHealthService: BusinessHealthService) {}

  @Get("channel-availability")
  getChannelAvailabilityEnvelope() {
    return {
      success: true,
      data: this.businessHealthService.getChannelAvailabilityEnvelope(),
    };
  }
}
