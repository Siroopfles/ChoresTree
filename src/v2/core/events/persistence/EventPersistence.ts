import { connect as amqpConnect, Channel as AMQPChannel, Message, MessageProperties } from 'amqplib';
import { EventError } from '../errors/EventErrors';

interface AMQPConnection {
  createChannel(): Promise<AMQPChannel>;
  close(): Promise<void>;
}

interface AMQPMessageFields {
  deliveryTag: number;
  redelivered: boolean;
  exchange: string;
  routingKey: string;
}

type AMQPMessage = {
  content: Buffer;
  fields: AMQPMessageFields;
  properties: MessageProperties;
} & Message;


/**
 * Configuration for event persistence
 */
export interface EventPersistenceConfig {
  url: string;
  exchange: string;
  deadLetterExchange: string;
  retryCount: number;
  retryDelay: number;
}

/**
 * Handles event persistence using RabbitMQ
 */
export class EventPersistence {
  private connection: AMQPConnection | null = null;
  private channel: AMQPChannel | null = null;

  constructor(private readonly config: EventPersistenceConfig) {}

  /**
   * Initialize connection and setup exchanges
   */
  public async initialize(): Promise<void> {
    try {
      const connection = await amqpConnect(this.config.url);
      this.connection = connection as unknown as AMQPConnection;
      
      if (!this.connection) {
        throw new EventError('Failed to establish connection');
      }

      const channel = await this.connection.createChannel();
      this.channel = channel;
      
      if (!this.channel) {
        throw new EventError('Failed to create channel');
      }

      // Setup main exchange
      await this.channel.assertExchange(this.config.exchange, 'topic', {
        durable: true
      });

      // Setup dead letter exchange
      await this.channel.assertExchange(this.config.deadLetterExchange, 'topic', {
        durable: true
      });

    } catch (error) {
      throw new EventError(`Failed to initialize event persistence: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publish event to RabbitMQ
   */
  public async publishEvent<T>(
    eventType: string,
    event: T,
    attempts: number = 1
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Event persistence not initialized');
    }

    const headers = {
      'x-retry-count': attempts
    };

    try {
      await this.channel.publish(
        this.config.exchange,
        eventType,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          headers
        }
      );
    } catch (error) {
      throw new Error(`Failed to publish event: ${error}`);
    }
  }

  /**
   * Setup consumer for event type
   */
  public async consumeEvents<T>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Event persistence not initialized');
    }

    const queue = `queue.${eventType}`;
    const deadLetterQueue = `queue.${eventType}.dead-letter`;
    const retryQueue = `queue.${eventType}.retry`;

    // Setup queues
    await this.setupQueues(queue, deadLetterQueue, retryQueue);

    // Consume from main queue
    await this.channel.consume(queue, async (msg: AMQPMessage | null) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString()) as T;
        await handler(event);
        this.channel?.ack(msg);
      } catch (error) {
        if (!this.channel) return;

        const headers = msg.properties.headers ?? {};
        const retryCount = (headers['x-retry-count'] as number) ?? 0;
        
        if (retryCount < this.config.retryCount) {
          // Retry with delay
          await this.channel.publish(
            this.config.exchange,
            eventType,
            msg.content,
            {
              persistent: true,
              headers: {
                'x-retry-count': retryCount + 1,
                'x-error': error instanceof Error ? error.message : String(error)
              }
            }
          );
          this.channel.ack(msg);
        } else {
          // Move to dead letter queue
          await this.channel.publish(
            this.config.deadLetterExchange,
            eventType,
            msg.content,
            {
              persistent: true,
              headers: {
                ...headers,
                'x-final-error': error instanceof Error ? error.message : String(error)
              }
            }
          );
          this.channel.ack(msg);
        }
      }
    });
  }

  private async setupQueues(
    queue: string,
    deadLetterQueue: string,
    retryQueue: string
  ): Promise<void> {
    if (!this.channel) return;

    // Main queue
    await this.channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: this.config.deadLetterExchange
    });

    // Dead letter queue
    await this.channel.assertQueue(deadLetterQueue, {
      durable: true
    });

    // Retry queue
    await this.channel.assertQueue(retryQueue, {
      durable: true,
      messageTtl: this.config.retryDelay,
      deadLetterExchange: this.config.exchange
    });

    // Bind queues
    await this.channel.bindQueue(queue, this.config.exchange, queue);
    await this.channel.bindQueue(deadLetterQueue, this.config.deadLetterExchange, queue);
    await this.channel.bindQueue(retryQueue, this.config.exchange, `${queue}.retry`);
  }

  /**
   * Close connection
   */
  public async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      throw new EventError(`Failed to close event persistence: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}