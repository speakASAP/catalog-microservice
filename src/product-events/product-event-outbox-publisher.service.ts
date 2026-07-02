import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { LoggerService } from '../logger/logger.service';
import { CatalogProductEventOutbox } from './product-event-outbox.entity';
import { ProductEventRabbitMqAdapter } from './product-event-rabbitmq.adapter';
import type { CatalogEventBrokerPublishInput } from './product-event-rabbitmq.adapter';
import {
  CATALOG_PRODUCT_EVENT_TYPES,
  CatalogProductEventEnvelope,
  CatalogProductEventOutboxStatus,
  CatalogProductEventType,
} from './product-event.types';

export type CatalogProductEventPublishResult = {
  eventType: CatalogProductEventType;
  status: 'published' | 'failed' | 'dead_letter';
  eventId: string;
  error?: string;
  timestamp: string;
};

type CatalogProductEventOutboxCounts = Record<CatalogProductEventOutboxStatus, number>;
type HeaderValue = string | number | boolean;

const CATALOG_EVENTS_EXCHANGE = 'catalog.events';
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_REPLAY_INTERVAL_MS = 60000;
const DEFAULT_RETRY_DELAY_MS = 30000;
const DEFAULT_MAX_RETRY_DELAY_MS = 300000;
const DEFAULT_MAX_ATTEMPTS = 12;
const MAX_HEADER_COUNT = 16;
const MAX_HEADER_KEY_LENGTH = 64;
const MAX_HEADER_VALUE_LENGTH = 256;
const MAX_ERROR_LENGTH = 2000;

class ProductEventContractError extends Error {
  readonly nonRetryable = true;
}

@Injectable()
export class ProductEventOutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private replayTimer: NodeJS.Timeout | null = null;
  private publishAttempts = 0;
  private publishFailures = 0;
  private deadLetters = 0;
  private replayAttempts = 0;
  private replayFailures = 0;
  private lastPublishResult: CatalogProductEventPublishResult | null = null;
  private lastReplayAt: string | null = null;
  private readonly replayBatchSize = positiveInt(
    process.env.CATALOG_EVENT_OUTBOX_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
  );
  private readonly replayIntervalMs = nonNegativeInt(
    process.env.CATALOG_EVENT_OUTBOX_REPLAY_INTERVAL_MS,
    DEFAULT_REPLAY_INTERVAL_MS,
  );
  private readonly retryDelayMs = positiveInt(
    process.env.CATALOG_EVENT_OUTBOX_RETRY_DELAY_MS,
    DEFAULT_RETRY_DELAY_MS,
  );
  private readonly maxRetryDelayMs = positiveInt(
    process.env.CATALOG_EVENT_OUTBOX_RETRY_MAX_DELAY_MS,
    DEFAULT_MAX_RETRY_DELAY_MS,
  );

  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(CatalogProductEventOutbox)
    private readonly outboxRepository: Repository<CatalogProductEventOutbox>,
    private readonly broker: ProductEventRabbitMqAdapter,
  ) {}

  async onModuleInit() {
    if (!this.broker.isEnabled()) {
      this.logger.warn(
        'Catalog product event publisher disabled; set CATALOG_EVENT_PUBLISHER_ENABLED=true after broker runtime is wired.',
        'ProductEventOutboxPublisherService',
      );
      return;
    }

    await this.broker.connect().catch((error: unknown) => {
      const errorMessage = toErrorMessage(error);
      this.logger.error(
        `Catalog product event broker connect failed: ${errorMessage}`,
        error instanceof Error ? error.stack : '',
        'ProductEventOutboxPublisherService',
      );
    });

    await this.publishDueEvents().catch((error: unknown) => {
      const errorMessage = toErrorMessage(error);
      this.logger.error(
        `Catalog product event initial replay failed: ${errorMessage}`,
        error instanceof Error ? error.stack : '',
        'ProductEventOutboxPublisherService',
      );
    });

    this.startReplayTimer();
  }

  async onModuleDestroy() {
    if (this.replayTimer) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
    }
    await this.broker.close();
  }

  async publishDueEvents(limit = this.replayBatchSize): Promise<CatalogProductEventPublishResult[]> {
    if (!this.broker.isEnabled()) {
      return [];
    }

    const dueEvents = await this.findDueEvents(limit);
    if (dueEvents.length === 0) {
      return [];
    }

    this.replayAttempts += 1;
    this.lastReplayAt = new Date().toISOString();

    const results: CatalogProductEventPublishResult[] = [];
    for (const outboxEvent of dueEvents) {
      const claimedEvent = await this.claimForPublishing(outboxEvent);
      if (!claimedEvent) {
        continue;
      }

      const result = await this.publishClaimedEvent(claimedEvent);
      results.push(result);
      this.logPublishResult(result, claimedEvent);
    }

    return results;
  }

  async getPublishStatus() {
    return {
      connection: this.broker.getConnectionStatus(),
      attempts: this.publishAttempts,
      failures: this.publishFailures,
      deadLetters: this.deadLetters,
      lastResult: this.lastPublishResult,
      outbox: {
        counts: await this.getOutboxCounts(),
        replayAttempts: this.replayAttempts,
        replayFailures: this.replayFailures,
        lastReplayAt: this.lastReplayAt,
        batchSize: this.replayBatchSize,
        retryDelayMs: this.retryDelayMs,
        maxRetryDelayMs: this.maxRetryDelayMs,
      },
    };
  }

  private startReplayTimer() {
    if (this.replayIntervalMs <= 0 || this.replayTimer) {
      return;
    }

    this.replayTimer = setInterval(() => {
      this.publishDueEvents().catch((error: unknown) => {
        const errorMessage = toErrorMessage(error);
        this.logger.error(
          `Catalog product event outbox replay failed: ${errorMessage}`,
          error instanceof Error ? error.stack : '',
          'ProductEventOutboxPublisherService',
        );
      });
    }, this.replayIntervalMs);
  }

  private async findDueEvents(limit: number): Promise<CatalogProductEventOutbox[]> {
    return this.outboxRepository.find({
      where: [
        { status: 'pending' },
        { status: 'failed', nextAttemptAt: IsNull() },
        { status: 'failed', nextAttemptAt: LessThanOrEqual(new Date()) },
      ],
      order: { createdAt: 'ASC' },
      take: Math.max(1, Math.floor(limit)),
    } as any);
  }

  private async claimForPublishing(row: CatalogProductEventOutbox): Promise<CatalogProductEventOutbox | null> {
    if (this.maxAttemptsFor(row) <= this.attemptsFor(row)) {
      return this.deadLetterBeforePublish(row, 'Max attempts exceeded before publish');
    }

    const result = await this.outboxRepository
      .createQueryBuilder()
      .update(CatalogProductEventOutbox)
      .set({ status: 'publishing' })
      .where('id = :id', { id: row.id })
      .andWhere('status IN (:...statuses)', { statuses: ['pending', 'failed'] })
      .execute();

    if (!result.affected) {
      return null;
    }

    return Object.assign(new CatalogProductEventOutbox(), row, { status: 'publishing' });
  }

  private async publishClaimedEvent(row: CatalogProductEventOutbox): Promise<CatalogProductEventPublishResult> {
    this.publishAttempts += 1;
    const attempts = this.attemptsFor(row) + 1;

    try {
      this.validateOutboxRow(row);
      await this.broker.publishEvent({
        exchange: CATALOG_EVENTS_EXCHANGE,
        routingKey: row.eventType,
        payload: row.payload,
        options: this.buildPublishOptions(row),
      });

      const result = this.result(row, 'published');
      await this.outboxRepository.save({
        ...row,
        status: 'published',
        attempts,
        lastError: null,
        nextAttemptAt: null,
        publishedAt: new Date(),
      });
      this.lastPublishResult = result;
      return result;
    } catch (error: unknown) {
      const errorMessage = truncate(toErrorMessage(error), MAX_ERROR_LENGTH);
      const nonRetryable = error instanceof ProductEventContractError;
      const deadLetter = nonRetryable || attempts >= this.maxAttemptsFor(row);

      this.publishFailures += 1;
      this.replayFailures += 1;

      if (deadLetter) {
        this.deadLetters += 1;
        const result = this.result(row, 'dead_letter', errorMessage);
        await this.outboxRepository.save({
          ...row,
          status: 'dead_letter',
          attempts,
          lastError: errorMessage,
          nextAttemptAt: null,
          publishedAt: null,
        });
        this.lastPublishResult = result;
        return result;
      }

      const result = this.result(row, 'failed', errorMessage);
      await this.outboxRepository.save({
        ...row,
        status: 'failed',
        attempts,
        lastError: errorMessage,
        nextAttemptAt: this.nextAttemptAt(attempts),
        publishedAt: null,
      });
      this.lastPublishResult = result;
      return result;
    }
  }

  private async deadLetterBeforePublish(
    row: CatalogProductEventOutbox,
    errorMessage: string,
  ): Promise<CatalogProductEventOutbox> {
    this.deadLetters += 1;
    await this.outboxRepository.save({
      ...row,
      status: 'dead_letter',
      lastError: errorMessage,
      nextAttemptAt: null,
      publishedAt: null,
    });
    return Object.assign(new CatalogProductEventOutbox(), row, {
      status: 'dead_letter',
      lastError: errorMessage,
      nextAttemptAt: null,
      publishedAt: null,
    });
  }

  private buildPublishOptions(row: CatalogProductEventOutbox): CatalogEventBrokerPublishInput["options"] {
    return {
      persistent: true,
      contentType: 'application/json',
      messageId: row.eventId,
      type: row.eventType,
      timestamp: secondsTimestamp(row.payload?.occurredAt),
      headers: this.buildHeaders(row),
    };
  }

  private buildHeaders(row: CatalogProductEventOutbox): Record<string, HeaderValue> {
    const rowHeaders = isPlainObject(row.headers) ? row.headers : {};
    return boundedHeaders({
      ...rowHeaders,
      eventId: row.eventId,
      eventType: row.eventType,
      schemaVersion: row.schemaVersion,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      producer: row.payload?.producer?.service ?? 'catalog-microservice',
    });
  }

  private validateOutboxRow(row: CatalogProductEventOutbox): void {
    const payload = row.payload as Partial<CatalogProductEventEnvelope> | null;
    if (!payload || typeof payload !== 'object') {
      throw new ProductEventContractError('Invalid catalog event payload: payload must be an object');
    }
    if (!row.eventId || payload.eventId !== row.eventId) {
      throw new ProductEventContractError('Invalid catalog event payload: payload.eventId must match outbox.eventId');
    }
    if (!CATALOG_PRODUCT_EVENT_TYPES.includes(row.eventType as CatalogProductEventType)) {
      throw new ProductEventContractError(`Invalid catalog event type: ${row.eventType}`);
    }
    if (payload.eventType !== row.eventType) {
      throw new ProductEventContractError('Invalid catalog event payload: payload.eventType must match outbox.eventType');
    }
    if (row.routingKey !== row.eventType || payload.routingKey !== row.eventType) {
      throw new ProductEventContractError('Invalid catalog event payload: routing key must equal event type');
    }
    if (payload.eventVersion !== 1 || row.schemaVersion !== 1) {
      throw new ProductEventContractError('Invalid catalog event payload: schema/event version must be 1');
    }
    if (!payload.occurredAt || Number.isNaN(Date.parse(payload.occurredAt))) {
      throw new ProductEventContractError('Invalid catalog event payload: occurredAt must be ISO-8601 parseable');
    }
    if (payload.producer?.service !== 'catalog-microservice') {
      throw new ProductEventContractError('Invalid catalog event payload: producer.service must be catalog-microservice');
    }
    if (payload.aggregate?.type !== 'product' || payload.aggregate?.id !== row.aggregateId) {
      throw new ProductEventContractError('Invalid catalog event payload: aggregate must match outbox product aggregate');
    }
    if (payload.data?.product?.id !== row.aggregateId) {
      throw new ProductEventContractError('Invalid catalog event payload: data.product.id must match aggregate id');
    }
  }

  private nextAttemptAt(attempts: number): Date {
    const multiplier = Math.pow(2, Math.max(0, attempts - 1));
    const delayMs = Math.min(this.retryDelayMs * multiplier, this.maxRetryDelayMs);
    return new Date(Date.now() + delayMs);
  }

  private async getOutboxCounts(): Promise<CatalogProductEventOutboxCounts> {
    const counts: CatalogProductEventOutboxCounts = {
      pending: 0,
      publishing: 0,
      published: 0,
      failed: 0,
      dead_letter: 0,
    };

    try {
      const rows = await this.outboxRepository
        .createQueryBuilder('event')
        .select('event.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('event.status')
        .getRawMany();

      for (const row of rows) {
        if (row.status in counts) {
          counts[row.status as CatalogProductEventOutboxStatus] = parseInt(row.count, 10);
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to read catalog product event outbox status: ${toErrorMessage(error)}`,
        '',
        'ProductEventOutboxPublisherService',
      );
    }

    return counts;
  }

  private result(
    row: CatalogProductEventOutbox,
    status: CatalogProductEventPublishResult['status'],
    error?: string,
  ): CatalogProductEventPublishResult {
    return {
      eventType: row.eventType,
      status,
      eventId: row.eventId,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  private logPublishResult(result: CatalogProductEventPublishResult, row: CatalogProductEventOutbox): void {
    const fields = [
      `event=${result.eventType}`,
      `eventId=${result.eventId}`,
      `status=${result.status}`,
      `aggregateId=${row.aggregateId}`,
      row.sku ? `sku=${row.sku}` : null,
      result.error ? `error=${result.error}` : null,
    ].filter(Boolean).join(' ');

    if (result.status === 'published') {
      this.logger.log(`catalog_product_event_publish ${fields}`, 'ProductEventOutboxPublisherService');
      return;
    }

    this.logger.error(`catalog_product_event_publish ${fields}`, '', 'ProductEventOutboxPublisherService');
  }

  private attemptsFor(row: CatalogProductEventOutbox): number {
    return positiveOrZeroInt(row.attempts, 0);
  }

  private maxAttemptsFor(row: CatalogProductEventOutbox): number {
    return positiveInt(String(row.maxAttempts || ''), DEFAULT_MAX_ATTEMPTS);
  }
}

function boundedHeaders(headers: Record<string, unknown>): Record<string, HeaderValue> {
  const bounded: Record<string, HeaderValue> = {};

  for (const [rawKey, rawValue] of Object.entries(headers)) {
    if (Object.keys(bounded).length >= MAX_HEADER_COUNT) {
      break;
    }
    const key = sanitizeHeaderKey(rawKey);
    if (!key || bounded[key] !== undefined) {
      continue;
    }
    const value = sanitizeHeaderValue(rawValue);
    if (value === undefined) {
      continue;
    }
    bounded[key] = value;
  }

  return bounded;
}

function sanitizeHeaderKey(key: string): string {
  return key
    .replace(/[^A-Za-z0-9_.-]/g, '_')
    .slice(0, MAX_HEADER_KEY_LENGTH);
}

function sanitizeHeaderValue(value: unknown): HeaderValue | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return truncate(value, MAX_HEADER_VALUE_LENGTH);
  }
  return undefined;
}

function secondsTimestamp(isoTimestamp?: string): number | undefined {
  if (!isoTimestamp) {
    return undefined;
  }
  const parsed = Date.parse(isoTimestamp);
  return Number.isNaN(parsed) ? undefined : Math.floor(parsed / 1000);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function positiveOrZeroInt(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value;
}
