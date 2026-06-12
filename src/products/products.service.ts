import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Product } from './product.entity';
import { LoggerService } from '../logger/logger.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import axios from 'axios';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`, 'ProductsService');

    const product = this.productRepository.create(createProductDto);
    const saved = await this.productRepository.save(product);

    this.logger.log(`Product created: ${saved.id}`, 'ProductsService');
    return saved;
  }

  /**
   * Find all products with pagination and filters
   */
  async findAll(query: ProductQueryDto): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, search, isActive, categoryId } = query;
    const skip = (page - 1) * limit;

    this.logger.log(`Finding products: page=${page}, limit=${limit}, search=${search}`, 'ProductsService');

    const where: FindOptionsWhere<Product> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    // Search in title, sku, brand
    if (search) {
      queryBuilder.where(
        '(product.title ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive });
    }

    // Filter by category
    if (categoryId) {
      queryBuilder
        .innerJoin('product.categories', 'category')
        .andWhere('category.id = :categoryId', { categoryId });
    }

    // Include relations
    queryBuilder
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.media', 'media')
      .leftJoinAndSelect('product.pricing', 'pricing')
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`Found ${total} products`, 'ProductsService');

    return { items, total, page, limit };
  }

  /**
   * Find one product by ID
   */
  async findOne(id: string): Promise<Product> {
    this.logger.log(`Finding product: ${id}`, 'ProductsService');

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'attributes', 'attributes.attribute', 'media', 'pricing'],
    });

    if (!product) {
      this.logger.warn(`Product not found: ${id}`, 'ProductsService');
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku: string): Promise<Product | null> {
    this.logger.log(`Finding product by SKU: ${sku}`, 'ProductsService');

    return this.productRepository.findOne({
      where: { sku },
      relations: ['categories', 'media', 'pricing'],
    });
  }

  /**
   * Update a product
   */
  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    this.logger.log(`Updating product: ${id}`, 'ProductsService');

    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);

    const updated = await this.productRepository.save(product);
    this.logger.log(`Product updated: ${id}`, 'ProductsService');

    return updated;
  }


  async sellOnBazos(id: string, data: any = {}, authorization?: string) {
    const product = await this.findOne(id);

    if (!product.isActive) {
      return {
        success: false,
        blocked: true,
        reason: 'inactive_product',
        message: 'Only active catalog products can be sent to Bazos.',
      };
    }

    const activePrice = product.pricing?.find((price: any) => price.isActive) || product.pricing?.[0];
    if (!activePrice?.basePrice) {
      return {
        success: false,
        blocked: true,
        reason: 'price_required',
        message: 'A current catalog price is required before publishing to Bazos.',
      };
    }

    if (!authorization) {
      return {
        success: false,
        blocked: true,
        reason: 'auth_required',
        message: 'Please log in before starting Bazos publishing.',
      };
    }

    const bazosBaseUrl = process.env.BAZOS_SERVICE_URL || 'http://bazos-service:3000';
    const headers = { Authorization: authorization };
    const phoneNumber = String(data.phoneNumber || '').trim();
    const displayName = String(data.displayName || data.sellerName || '').trim();
    const location = String(data.location || '').trim();
    const category = String(data.category || product.categories?.[0]?.name || '').trim();

    if (!phoneNumber) {
      return {
        success: false,
        blocked: true,
        reason: 'phone_required',
        message: 'Enter the phone number you want to use on Bazos.',
      };
    }

    if (!displayName) {
      return {
        success: false,
        blocked: true,
        reason: 'seller_name_required',
        message: 'Enter the seller name shown with the Bazos ad.',
      };
    }

    if (!location) {
      return {
        success: false,
        blocked: true,
        reason: 'location_required',
        message: 'Choose the location for the Bazos advertisement.',
      };
    }

    if (!category) {
      return {
        success: false,
        blocked: true,
        reason: 'category_required',
        message: 'Choose a Bazos category for the advertisement.',
      };
    }

    const normalizedPhone = phoneNumber.replace(/\s+/g, '');
    const safePhone = normalizedPhone.replace(/[^0-9+]/g, '').replace(/^\+/, 'plus');
    const accountEmail = `${safePhone || 'seller'}@bazos.local`;
    let account: any;

    const accountsResponse = await axios.get(`${bazosBaseUrl}/accounts`, { headers });
    const accounts = accountsResponse.data?.data || accountsResponse.data || [];
    account = Array.isArray(accounts)
      ? accounts.find((item: any) => item.email === accountEmail || item.name === displayName)
      : undefined;

    if (!account) {
      const accountResponse = await axios.post(
        `${bazosBaseUrl}/accounts`,
        {
          name: displayName,
          email: accountEmail,
          isActive: true,
        },
        { headers },
      );
      account = accountResponse.data?.data || accountResponse.data;
    }

    const identitiesResponse = await axios.get(`${bazosBaseUrl}/identities?accountId=${account.id}`, { headers });
    const identities = identitiesResponse.data?.data || identitiesResponse.data || [];
    let identity = Array.isArray(identities)
      ? identities.find((item: any) => item.phoneNumber === phoneNumber || item.phoneNumber === normalizedPhone)
      : undefined;

    if (!identity) {
      const identityResponse = await axios.post(
        `${bazosBaseUrl}/identities`,
        {
          accountId: account.id,
          phoneNumber,
          displayName,
          contactName: displayName,
          contactPhone: phoneNumber,
          defaultLocation: location,
          sessionState: 'missing',
          status: 'draft',
          reviewState: 'clear',
        },
        { headers },
      );
      identity = identityResponse.data?.data || identityResponse.data;
    }

    let verificationSession: any = null;
    if (identity.sessionState !== 'ready' || identity.status !== 'verified') {
      const verificationResponse = await axios.post(
        `${bazosBaseUrl}/verification-sessions`,
        {
          identityId: identity.id,
          operatorUserId: data.operatorUserId,
          notes: 'Started from catalog Sell on Bazos guided flow',
        },
        { headers },
      );
      verificationSession = verificationResponse.data?.data || verificationResponse.data;
    }

    const offerPayload = {
      accountId: account.id,
      identityId: identity.id,
      productId: product.id,
      title: data.title || product.title,
      description: data.description || product.description,
      price: Number(activePrice.basePrice),
      category,
      location,
      stockQuantity: data.stockQuantity ?? 1,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const offerResponse = await axios.post(`${bazosBaseUrl}/offers`, offerPayload, { headers });
    const offer = offerResponse.data?.data || offerResponse.data;
    const offerId = offer?.id;

    if (!offerId) {
      throw new Error('Bazos service did not return an offer id.');
    }

    const queueResponse = await axios.post(
      `${bazosBaseUrl}/offers/${offerId}/enqueue-publish`,
      { identityId: identity.id },
      { headers },
    );

    return {
      success: true,
      productId: product.id,
      account,
      identity,
      verificationSession,
      bazosOffer: offer,
      queue: queueResponse.data,
      nextStep: verificationSession
        ? {
            type: 'human_verification_required',
            message: 'Open the Bazos verification page and complete phone/SMS/CAPTCHA/bank checks manually. After verification, mark the identity verified in Bazos service before final publishing.',
            verificationUrl: verificationSession.verificationUrl,
          }
        : {
            type: 'queued',
            message: 'The verified identity was accepted and the offer is queued for compliant publishing.',
          },
    };
  }

  /**
   * Delete a product (soft delete by setting isActive = false)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing product: ${id}`, 'ProductsService');

    const product = await this.findOne(id);
    product.isActive = false;
    await this.productRepository.save(product);

    this.logger.log(`Product deactivated: ${id}`, 'ProductsService');
  }

  /**
   * Hard delete a product
   */
  async hardRemove(id: string): Promise<void> {
    this.logger.log(`Hard deleting product: ${id}`, 'ProductsService');

    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    this.logger.log(`Product deleted: ${id}`, 'ProductsService');
  }
}

