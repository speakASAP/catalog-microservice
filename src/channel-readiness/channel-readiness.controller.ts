import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ChannelReadinessService } from './channel-readiness.service';

@Controller('products')
export class ChannelReadinessController {
  constructor(private readonly channelReadinessService: ChannelReadinessService) {}

  @Get(':id/channel-readiness')
  async getProductChannelReadiness(@Param('id', ParseUUIDPipe) id: string) {
    const readiness = await this.channelReadinessService.getProductReadiness(id);
    return { success: true, data: readiness };
  }
}
