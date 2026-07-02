import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { LoggerService } from '../logger/logger.service';
import { parseBpcpProcessEventEnvelope } from './bpcp-process-event.types';
import { BpcpProcessEventProjectionService } from './bpcp-process-event-projection.service';

type BpcpAmqpModule = {
  connect(url: string): Promise<BpcpAmqpConnection>;
};

type BpcpAmqpConnection = {
  createChannel(): Promise<BpcpAmqpChannel>;
  close(): Promise<void>;
  on?: (event: string, listener: (error?: unknown) => void) => void;
};

type BpcpAmqpChannel = {
  assertExchange(exchange: string, type: 'topic', options: { durable: true }): Promise<unknown>;
  assertQueue(queue: string, options: Record<string, unknown>): Promise<unknown>;
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<unknown>;
  prefetch(count: number): Promise<unknown> | void;
  consume(queue: string, listener: (message: BpcpAmqpMessage | null) => void, options: { noAck: false }): Promise<unknown>;
  ack(message: BpcpAmqpMessage): void;
  nack(message: BpcpAmqpMessage, allUpTo?: boolean, requeue?: boolean): void;
  close(): Promise<void>;
  on?: (event: string, listener: (error?: unknown) => void) => void;
};

type BpcpAmqpMessage = {
  content: Buffer;
  fields?: Record<string, unknown>;
  properties?: {
    headers?: Record<string, unknown>;
    messageId?: string;
    type?: string;
  };
};

type BpcpConsumerStatus = {
  schemaVersion: 'catalog.bpcp-process-consumer-status.v1';
  enabled: boolean;
  connection: {
    status: 'disabled' | 'up' | 'down';
    exchange: string;
    queue: string;
    routingKeys: string[];
    urlConfigured: boolean;
    signingSecretConfigured: boolean;
    missing: string[];
    lastError: string | null;
  };
  counters: {
    received: number;
    applied: number;
    rejected: number;
    signatureFailures: number;
  };
  lastReceivedAt: string | null;
  lastAppliedEventId: string | null;
};

@Injectable()
export class BpcpProcessEventConsumerService implements OnModuleInit, OnModuleDestroy {
  private connection: BpcpAmqpConnection | null = null;
  private channel: BpcpAmqpChannel | null = null;
  private lastError: string | null = null;
  private received = 0;
  private applied = 0;
  private rejected = 0;
  private signatureFailures = 0;
  private lastReceivedAt: string | null = null;
  private lastAppliedEventId: string | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly projection: BpcpProcessEventProjectionService,
  ) {}

  async onModuleInit() {
    if (!this.config().enabled) {
      this.logger.warn(
        'BPCP process event consumer disabled; set CATALOG_BPCP_EVENTS_CONSUMER_ENABLED=true to bind catalog queue.',
        'BpcpProcessEventConsumerService',
      );
      return;
    }

    await this.connect().catch((error: unknown) => {
      this.lastError = toErrorMessage(error);
      this.logger.error(
        `BPCP process event consumer connect failed: ${this.lastError}`,
        error instanceof Error ? error.stack : '',
        'BpcpProcessEventConsumerService',
      );
    });
  }

  async onModuleDestroy() {
    await this.close();
  }

  getStatus(): BpcpConsumerStatus {
    const config = this.config();
    return {
      schemaVersion: 'catalog.bpcp-process-consumer-status.v1',
      enabled: config.enabled,
      connection: {
        status: config.enabled ? (this.channel ? 'up' : 'down') : 'disabled',
        exchange: config.exchange,
        queue: config.queue,
        routingKeys: config.routingKeys,
        urlConfigured: Boolean(config.url),
        signingSecretConfigured: Boolean(config.signingSecret),
        missing: config.missing,
        lastError: this.lastError,
      },
      counters: {
        received: this.received,
        applied: this.applied,
        rejected: this.rejected,
        signatureFailures: this.signatureFailures,
      },
      lastReceivedAt: this.lastReceivedAt,
      lastAppliedEventId: this.lastAppliedEventId,
    };
  }

  async connect(): Promise<void> {
    const config = this.config();
    if (!config.enabled) {
      throw new Error('[MISSING: CATALOG_BPCP_EVENTS_CONSUMER_ENABLED=true]');
    }
    if (config.missing.length > 0 || !config.url) {
      throw new Error(config.missing.join('; '));
    }
    if (this.channel) {
      return;
    }

    const amqp = this.loadAmqpClient();
    const connection = await amqp.connect(config.url);
    this.connection = connection;
    this.bindConnectionHandlers(connection);

    const channel = await connection.createChannel();
    this.channel = channel;
    this.bindChannelHandlers(channel);
    await channel.assertExchange(config.exchange, 'topic', { durable: true });
    await channel.assertExchange(config.deadLetterExchange, 'topic', { durable: true });
    await channel.assertQueue(config.deadLetterQueue, { durable: true });
    await channel.bindQueue(config.deadLetterQueue, config.deadLetterExchange, config.deadLetterRoutingKey);
    await channel.assertQueue(config.queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': config.deadLetterExchange,
        'x-dead-letter-routing-key': config.deadLetterRoutingKey,
      },
    });
    for (const routingKey of config.routingKeys) {
      await channel.bindQueue(config.queue, config.exchange, routingKey);
    }
    await channel.prefetch(config.prefetch);
    await channel.consume(config.queue, (message) => { void this.handleMessage(message, config.signingSecret); }, { noAck: false });
    this.lastError = null;
    this.logger.log(
      `BPCP process event consumer bound ${config.exchange}:${config.routingKeys.join(',')} -> ${config.queue}`,
      'BpcpProcessEventConsumerService',
    );
  }

  private async handleMessage(message: BpcpAmqpMessage | null, signingSecret: string | null): Promise<void> {
    if (!message) {
      return;
    }
    this.received += 1;
    this.lastReceivedAt = new Date().toISOString();

    try {
      if (!this.hasValidSignature(message, signingSecret)) {
        this.signatureFailures += 1;
        throw new Error('Invalid BPCP process event signature');
      }
      const parsed = JSON.parse(message.content.toString('utf8'));
      const event = parseBpcpProcessEventEnvelope(parsed);
      const result = await this.projection.applyEvent(event);
      if (result.applied) {
        this.applied += 1;
        this.lastAppliedEventId = event.id;
      }
      this.channel?.ack(message);
    } catch (error: unknown) {
      this.rejected += 1;
      this.lastError = toErrorMessage(error);
      this.logger.warn(`Rejecting BPCP process event: ${this.lastError}`, 'BpcpProcessEventConsumerService');
      this.channel?.nack(message, false, false);
    }
  }

  private hasValidSignature(message: BpcpAmqpMessage, signingSecret: string | null): boolean {
    if (!signingSecret) {
      return false;
    }
    const headers = message.properties?.headers ?? {};
    const signature = typeof headers['x-bpcp-signature'] === 'string' ? headers['x-bpcp-signature'] : '';
    const expected = createHmac('sha256', signingSecret).update(message.content).digest('hex');
    return safeEqualHex(signature, expected);
  }

  private async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (error: unknown) {
      this.lastError = toErrorMessage(error);
    }
  }

  private config() {
    const enabled = parseBoolean(process.env.CATALOG_BPCP_EVENTS_CONSUMER_ENABLED);
    const url = optionalEnv('CATALOG_BPCP_EVENTS_RABBITMQ_URL') ?? optionalEnv('RABBITMQ_URL');
    const signingSecret = optionalEnv('BPCP_PROCESS_SIGNING_SECRET') ?? optionalEnv('CATALOG_BPCP_PROCESS_SIGNING_SECRET');
    const exchange = optionalEnv('CATALOG_BPCP_EVENTS_EXCHANGE') ?? 'bpcp.events';
    const legacyRoutingKey = optionalEnv('CATALOG_BPCP_EVENTS_ROUTING_KEY');
    const routingKeys = listEnv('CATALOG_BPCP_EVENTS_ROUTING_KEYS', legacyRoutingKey ? [legacyRoutingKey] : [
      'bpcp.process.published.v1',
      'bpcp.process.paused.v1',
      'bpcp.process.retired.v1',
    ]);
    const queue = optionalEnv('CATALOG_BPCP_EVENTS_QUEUE') ?? 'catalog.bpcp.process-lifecycle.v1';
    const deadLetterExchange = optionalEnv('CATALOG_BPCP_EVENTS_DLX') ?? 'catalog.bpcp.events.dlx';
    const deadLetterQueue = optionalEnv('CATALOG_BPCP_EVENTS_DLQ') ?? 'catalog.bpcp.process-lifecycle.v1.dlq';
    const deadLetterRoutingKey = optionalEnv('CATALOG_BPCP_EVENTS_DLQ_ROUTING_KEY') ?? 'catalog.bpcp.process-lifecycle.v1.dead';
    const prefetch = positiveInt(process.env.CATALOG_BPCP_EVENTS_PREFETCH, 5);
    const missing: string[] = [];

    if (!enabled) {
      missing.push('[MISSING: CATALOG_BPCP_EVENTS_CONSUMER_ENABLED=true]');
    }
    if (enabled && !url) {
      missing.push('[MISSING: CATALOG_BPCP_EVENTS_RABBITMQ_URL or RABBITMQ_URL]');
    }
    if (enabled && !signingSecret) {
      missing.push('[MISSING: BPCP_PROCESS_SIGNING_SECRET or CATALOG_BPCP_PROCESS_SIGNING_SECRET]');
    }
    if (enabled && !this.hasAmqpClient()) {
      missing.push('[MISSING: amqplib package in Catalog runtime image or approved equivalent broker client]');
    }

    return { enabled, url, signingSecret, exchange, routingKeys, queue, deadLetterExchange, deadLetterQueue, deadLetterRoutingKey, prefetch, missing };
  }

  private hasAmqpClient(): boolean {
    try {
      require.resolve('amqplib');
      return true;
    } catch (_error) {
      return false;
    }
  }

  private loadAmqpClient(): BpcpAmqpModule {
    try {
      return require('amqplib') as BpcpAmqpModule;
    } catch (_error) {
      throw new Error('[MISSING: amqplib package in Catalog runtime image or approved equivalent broker client]');
    }
  }

  private bindConnectionHandlers(connection: BpcpAmqpConnection): void {
    if (!connection.on) {
      return;
    }
    connection.on('error', (error?: unknown) => {
      this.lastError = toErrorMessage(error);
      this.logger.error(`BPCP event connection error: ${this.lastError}`, '', 'BpcpProcessEventConsumerService');
    });
    connection.on('close', () => {
      this.channel = null;
      this.connection = null;
    });
  }

  private bindChannelHandlers(channel: BpcpAmqpChannel): void {
    if (!channel.on) {
      return;
    }
    channel.on('error', (error?: unknown) => {
      this.lastError = toErrorMessage(error);
      this.logger.error(`BPCP event channel error: ${this.lastError}`, '', 'BpcpProcessEventConsumerService');
    });
    channel.on('close', () => {
      this.channel = null;
    });
  }
}

function parseBoolean(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase());
}

function listEnv(name: string, fallback: string[] = []): string[] {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('[MISSING:')) {
    return fallback;
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('[MISSING:')) {
    return null;
  }
  return value;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeEqualHex(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]+$/i.test(actual) || actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
