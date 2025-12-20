import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './media.entity';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly logger: LoggerService,
  ) {}

  async findByProduct(productId: string): Promise<Media[]> {
    return this.mediaRepository.find({
      where: { productId },
      order: { position: 'ASC' },
    });
  }

  async create(data: Partial<Media>): Promise<Media> {
    this.logger.log(`Creating media for product: ${data.productId}`, 'MediaService');
    const media = this.mediaRepository.create(data);
    return this.mediaRepository.save(media);
  }

  async update(id: string, data: Partial<Media>): Promise<Media> {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media ${id} not found`);
    }
    Object.assign(media, data);
    return this.mediaRepository.save(media);
  }

  async remove(id: string): Promise<void> {
    const result = await this.mediaRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Media ${id} not found`);
    }
  }

  async setPrimary(id: string): Promise<Media> {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media ${id} not found`);
    }

    // Unset other primary media for this product
    await this.mediaRepository.update(
      { productId: media.productId },
      { isPrimary: false }
    );

    // Set this as primary
    media.isPrimary = true;
    return this.mediaRepository.save(media);
  }
}

