import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, createHmac, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Media } from './media.entity';
import { LoggerService } from '../logger/logger.service';

type UploadedMediaFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type UploadMediaInput = {
  productId: string;
  file: UploadedMediaFile;
  altText?: string;
  position?: number;
  isPrimary?: boolean;
  metadata?: Partial<Media['metadata']>;
};

type S3Request = {
  method: string;
  bucket: string;
  key?: string;
  body?: Buffer | string;
  contentType?: string;
};

@Injectable()
export class MediaService {
  private bucketReady = false;

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

  async upload(input: UploadMediaInput): Promise<Media> {
    if (!input.productId) {
      throw new BadRequestException('productId is required');
    }
    if (!input.file?.buffer?.length) {
      throw new BadRequestException('A media file is required');
    }

    await this.ensureMediaBucket();

    const bucket = this.getBucket();
    const objectKey = this.buildObjectKey(input.productId, input.file.originalname);
    await this.sendS3Request({
      method: 'PUT',
      bucket,
      key: objectKey,
      body: input.file.buffer,
      contentType: input.file.mimetype || 'application/octet-stream',
    });

    const media = this.mediaRepository.create({
      productId: input.productId,
      type: this.getMediaType(input.file.mimetype),
      url: this.getPublicObjectUrl(bucket, objectKey),
      altText: input.altText || input.file.originalname,
      title: input.file.originalname,
      position: Number.isFinite(input.position) ? input.position : 0,
      isPrimary: Boolean(input.isPrimary),
      metadata: {
        size: input.file.size,
        mimeType: input.file.mimetype,
        ...(input.metadata || {}),
      },
    });

    this.logger.log(
      `Uploaded media for product ${input.productId}: ${objectKey}`,
      'MediaService',
    );
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

  private async ensureMediaBucket(): Promise<void> {
    if (this.bucketReady) {
      return;
    }

    const bucket = this.getBucket();
    const createResponse = await this.sendS3Request({
      method: 'PUT',
      bucket,
    }, [200, 409]);

    if (![200, 409].includes(createResponse.status)) {
      throw new InternalServerErrorException('Unable to prepare media bucket');
    }

    if (process.env.CATALOG_MEDIA_PUBLIC_READ !== 'false') {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      });

      await this.sendS3Request({
        method: 'PUT',
        bucket,
        key: '?policy',
        body: policy,
        contentType: 'application/json',
      }, [200, 204]);
    }

    this.bucketReady = true;
  }

  private getMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    return 'document';
  }

  private buildObjectKey(productId: string, originalName: string): string {
    const safeName = originalName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'media-file';

    return `catalog/products/${productId}/${randomUUID()}-${safeName}`;
  }

  private getPublicObjectUrl(bucket: string, key: string): string {
    const baseUrl = process.env.CATALOG_MEDIA_PUBLIC_BASE_URL || 'https://minio.alfares.cz';
    return `${baseUrl.replace(/\/+$/, '')}/${bucket}/${this.encodePath(key)}`;
  }

  private getBucket(): string {
    return process.env.CATALOG_MEDIA_BUCKET || 'catalog-media';
  }

  private getS3Endpoint(): URL {
    return new URL(
      process.env.CATALOG_MEDIA_S3_ENDPOINT ||
        'http://minio-microservice.statex-apps.svc.cluster.local:9000',
    );
  }

  private getS3Credentials(): { accessKey: string; secretKey: string; region: string } {
    const accessKey = process.env.CATALOG_MEDIA_S3_ACCESS_KEY || 'minioadmin';
    const secretKey =
      process.env.CATALOG_MEDIA_S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

    if (!secretKey) {
      throw new InternalServerErrorException('Catalog media storage is not configured');
    }

    return {
      accessKey,
      secretKey,
      region: process.env.CATALOG_MEDIA_S3_REGION || 'us-east-1',
    };
  }

  private async sendS3Request(
    request: S3Request,
    okStatuses = [200, 204],
  ): Promise<Response> {
    const endpoint = this.getS3Endpoint();
    const { accessKey, secretKey, region } = this.getS3Credentials();
    const query = request.key?.startsWith('?') ? request.key : '';
    const objectKey = query ? undefined : request.key;
    const path = `/${request.bucket}${objectKey ? `/${this.encodePath(objectKey)}` : ''}${query}`;
    const url = new URL(path, endpoint);
    const canonicalQuery = query === '?policy' ? 'policy=' : (url.search ? url.search.slice(1) : '');
    const body = request.body ? Buffer.from(request.body) : Buffer.alloc(0);
    const payloadHash = this.sha256Hex(body);
    const amzDate = this.getAmzDate();
    const dateStamp = amzDate.slice(0, 8);
    const host = url.host;
    const contentType = request.contentType || 'application/octet-stream';
    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      request.method,
      url.pathname,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256Hex(canonicalRequest),
    ].join('\n');
    const signature = this.hmacHex(
      this.getSigningKey(secretKey, dateStamp, region),
      stringToSign,
    );

    const response = await fetch(url, {
      method: request.method,
      headers: {
        Authorization:
          `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
          `SignedHeaders=${signedHeaders}, Signature=${signature}`,
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
      body: request.method === 'PUT' ? body : undefined,
    });

    if (!okStatuses.includes(response.status)) {
      const errorBody = await response.text();
      this.logger.error(
        `S3 request failed: ${request.method} ${url.pathname}${url.search} ${response.status} ${errorBody}`,
        undefined,
        'MediaService',
      );
      throw new InternalServerErrorException('Media storage request failed');
    }

    return response;
  }

  private encodePath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  private getAmzDate(): string {
    return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  private sha256Hex(value: Buffer | string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private hmac(key: Buffer | string, value: string): Buffer {
    return createHmac('sha256', key).update(value).digest();
  }

  private hmacHex(key: Buffer | string, value: string): string {
    return createHmac('sha256', key).update(value).digest('hex');
  }

  private getSigningKey(secretKey: string, dateStamp: string, region: string): Buffer {
    const dateKey = this.hmac(`AWS4${secretKey}`, dateStamp);
    const dateRegionKey = this.hmac(dateKey, region);
    const dateRegionServiceKey = this.hmac(dateRegionKey, 's3');
    return this.hmac(dateRegionServiceKey, 'aws4_request');
  }
}
