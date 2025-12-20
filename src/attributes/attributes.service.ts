import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribute } from './attribute.entity';
import { ProductAttribute } from './product-attribute.entity';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
    @InjectRepository(ProductAttribute)
    private readonly productAttributeRepository: Repository<ProductAttribute>,
    private readonly logger: LoggerService,
  ) {}

  async findAll(): Promise<Attribute[]> {
    return this.attributeRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Attribute> {
    const attribute = await this.attributeRepository.findOne({ where: { id } });
    if (!attribute) {
      throw new NotFoundException(`Attribute ${id} not found`);
    }
    return attribute;
  }

  async create(data: Partial<Attribute>): Promise<Attribute> {
    this.logger.log(`Creating attribute: ${data.name}`, 'AttributesService');
    const attribute = this.attributeRepository.create(data);
    return this.attributeRepository.save(attribute);
  }

  async update(id: string, data: Partial<Attribute>): Promise<Attribute> {
    const attribute = await this.findOne(id);
    Object.assign(attribute, data);
    return this.attributeRepository.save(attribute);
  }

  async setProductAttribute(productId: string, attributeId: string, value: string): Promise<ProductAttribute> {
    let pa = await this.productAttributeRepository.findOne({
      where: { productId, attributeId },
    });

    if (pa) {
      pa.value = value;
    } else {
      pa = this.productAttributeRepository.create({ productId, attributeId, value });
    }

    return this.productAttributeRepository.save(pa);
  }

  async getProductAttributes(productId: string): Promise<ProductAttribute[]> {
    return this.productAttributeRepository.find({
      where: { productId },
      relations: ['attribute'],
    });
  }
}

