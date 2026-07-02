import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import type { CatalogProductEventEnvelope, CatalogProductEventType } from './product-event.types';

type CatalogEventHeaderValue = string | number | boolean;

export type CatalogEventBrokerPublishInput = {
  exchange: 'catalog.events';
  routingKey: CatalogProductEventType;
  payload: CatalogProductEventEnvelope;
  options: {
    persistent: true;
    contentType: 'application/json';
    messageId: string;
    type: CatalogProductEventType;
    timestamp?: number;
    headers: Record<string, CatalogEventHeaderValue>;
  };
};

export type CatalogEventBrokerConnectionStatus = {
  status: 'disabled' | 'up' | 'down';
  enabled: boolean;
  exchange: 'catalog.events';
  urlConfigured: boolean;
  missing: string[];
  lastError: string | null;
};

type CatalogEventAmqpModule = {
  connect(url: string): Promise<CatalogEventAmqpConnection>;
};

type CatalogEventAmqpConnection = {
  createChannel(): Promise<CatalogEventAmqpChannel>;
  createConfirmChannel?: () => Promise<CatalogEventAmqpChannel>;
  close(): Promise<void>;
  on?: (event: string, listener: (error?: unknown) => void) => void;
};

type CatalogEventAmqpChannel = {
  assertExchange(exchange: string, type: 'topic', options: { durable: true }): Promise<unknown>;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: CatalogEventBrokerPublishInput['options'],
  ): boolean;
  waitForConfirms?: () => Promise<void>;
  close(): Promise<void>;
  on?: (event: string, listener: (error?: unknown) => void) => void;
};

const CATALOG_EVENTS_EXCHANGE = 'catalog.events';

@Injectable()
export class ProductEventRabbitMqAdapter implements OnModuleDestroy {
  private connection: CatalogEventAmqpConnection | null = null;
  private channel: CatalogEventAmqpChannel | null = null;
  private lastConnectionError: string | null = null;

  constructor(private readonly logger: LoggerService) {}

  async onModuleDestroy() {
    await this.close();
  }

  isEnabled(): boolean {
    return parseBoolean(process.env.CATALOG_EVENT_PUBLISHER_ENABLED);
  }

  getConnectionStatus(): CatalogEventBrokerConnectionStatus {
    const enabled = this.isEnabled();
    const missing: string[] = [];

    if (!enabled) {
      missing.push('[MISSING: CATALOG_EVENT_PUBLISHER_ENABLED=true]');
    }
    if (enabled && !this.getRabbitMqUrl()) {
      missing.push('[MISSING: CATALOG_EVENTS_RABBITMQ_URL or RABBITMQ_URL]');
    }
    if (enabled && !this.hasAmqpClient()) {
      missing.push('[MISSING: amqplib package in Catalog runtime image or approved equivalent broker client]');
    }

    return {
      status: enabled ? (this.channel ? 'up' : 'down') : 'disabled',
      enabled,
      exchange: CATALOG_EVENTS_EXCHANGE,
      urlConfigured: Boolean(this.getRabbitMqUrl()),
      missing,
      lastError: this.lastConnectionError,
    };
  }

  async connect(): Promise<void> {
    if (this.channel) {
      return;
    }
    if (!this.isEnabled()) {
      throw new Error('[MISSING: CATALOG_EVENT_PUBLISHER_ENABLED=true]');
    }

    const url = this.getRabbitMqUrl();
    if (!url) {
      throw new Error('[MISSING: CATALOG_EVENTS_RABBITMQ_URL or RABBITMQ_URL]');
    }

    try {
      const amqp = this.loadAmqpClient();
      this.logger.log('Connecting to Catalog event RabbitMQ broker', 'ProductEventRabbitMqAdapter');
      const connection = await amqp.connect(url);
      this.connection = connection;
      this.bindConnectionHandlers(connection);

      const channel = typeof connection.createConfirmChannel === 'function'
        ? await connection.createConfirmChannel()
        : await connection.createChannel();
      this.channel = channel;
      this.bindChannelHandlers(channel);
      await channel.assertExchange(CATALOG_EVENTS_EXCHANGE, 'topic', { durable: true });
      this.lastConnectionError = null;
      this.logger.log('Connected to Catalog event RabbitMQ broker', 'ProductEventRabbitMqAdapter');
    } catch (error: unknown) {
      this.lastConnectionError = toErrorMessage(error);
      this.channel = null;
      this.connection = null;
      throw error;
    }
  }

  async close(): Promise<void> {
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
      this.lastConnectionError = toErrorMessage(error);
      this.logger.error(
        `Error closing Catalog event RabbitMQ connection: ${this.lastConnectionError}`,
        error instanceof Error ? error.stack : '',
        'ProductEventRabbitMqAdapter',
      );
    }
  }

  async publishEvent(input: CatalogEventBrokerPublishInput): Promise<void> {
    await this.connect();
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const message = Buffer.from(JSON.stringify(input.payload));
    this.channel.publish(input.exchange, input.routingKey, message, input.options);
    if (typeof this.channel.waitForConfirms === 'function') {
      await this.channel.waitForConfirms();
    }
  }

  private getRabbitMqUrl(): string {
    return (process.env.CATALOG_EVENTS_RABBITMQ_URL || process.env.RABBITMQ_URL || '').trim();
  }

  private hasAmqpClient(): boolean {
    try {
      require.resolve('amqplib');
      return true;
    } catch (_error) {
      return false;
    }
  }

  private loadAmqpClient(): CatalogEventAmqpModule {
    try {
      return require('amqplib') as CatalogEventAmqpModule;
    } catch (_error) {
      throw new Error('[MISSING: amqplib package in Catalog runtime image or approved equivalent broker client]');
    }
  }

  private bindConnectionHandlers(connection: CatalogEventAmqpConnection): void {
    if (!connection.on) {
      return;
    }
    connection.on('error', (error?: unknown) => {
      this.lastConnectionError = toErrorMessage(error);
      this.logger.error(
        `Catalog event RabbitMQ connection error: ${this.lastConnectionError}`,
        '',
        'ProductEventRabbitMqAdapter',
      );
    });
    connection.on('close', () => {
      this.channel = null;
      this.connection = null;
    });
  }

  private bindChannelHandlers(channel: CatalogEventAmqpChannel): void {
    if (!channel.on) {
      return;
    }
    channel.on('error', (error?: unknown) => {
      this.lastConnectionError = toErrorMessage(error);
      this.logger.error(
        `Catalog event RabbitMQ channel error: ${this.lastConnectionError}`,
        '',
        'ProductEventRabbitMqAdapter',
      );
    });
    channel.on('close', () => {
      this.channel = null;
    });
  }
}

function parseBoolean(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase());
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
