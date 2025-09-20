import { rabbitMQ } from '../application/rabbitmq';
import { logger } from '../application/logging';
import { env } from '../application/env.validation';
import { MessagePayload } from './message-publisher.service';

export type MessageHandler = (message: MessagePayload) => Promise<void>;

export class MessageConsumerService {
  private handlers: Map<string, MessageHandler> = new Map();

  async setupConsumer(queueName: string, routingKeys: string[]): Promise<void> {
    try {
      if (!rabbitMQ.isReady()) {
        throw new Error('RabbitMQ is not connected');
      }

      const channel = rabbitMQ.getChannel();
      const fullQueueName = `${env.RABBITMQ_QUEUE_PREFIX}.${queueName}`;

      // Declare queue
      await channel.assertQueue(fullQueueName, {
        durable: true,
      });

      // Bind queue to exchange with routing keys
      for (const routingKey of routingKeys) {
        await channel.bindQueue(fullQueueName, env.RABBITMQ_EXCHANGE, routingKey);
        logger.info('Queue bound to exchange', {
          queue: fullQueueName,
          exchange: env.RABBITMQ_EXCHANGE,
          routingKey,
        });
      }

      // Set QoS to process one message at a time
      await channel.prefetch(1);

      // Start consuming messages
      await channel.consume(
        fullQueueName,
        (msg: any) => this.handleMessage(msg),
        { noAck: false }
      );

      logger.info('Consumer setup completed', {
        queue: fullQueueName,
        routingKeys,
      });

    } catch (error) {
      logger.error('Failed to setup consumer:', error, {
        queueName,
        routingKeys,
      });
      throw error;
    }
  }

  registerHandler(messageType: string, handler: MessageHandler): void {
    this.handlers.set(messageType, handler);
    logger.info('Message handler registered', { messageType });
  }

  private async handleMessage(msg: any): Promise<void> {
    if (!msg) {
      return;
    }

    const channel = rabbitMQ.getChannel();

    try {
      const content = msg.content.toString();
      const message: MessagePayload = JSON.parse(content);

      logger.info('Processing message', {
        messageId: message.id,
        type: message.type,
        routingKey: msg.fields.routingKey,
      });

      const handler = this.handlers.get(message.type);
      if (!handler) {
        logger.warn('No handler found for message type', {
          messageType: message.type,
          messageId: message.id,
        });
        // Acknowledge message to remove from queue
        channel.ack(msg);
        return;
      }

      // Process message with handler
      await handler(message);

      // Acknowledge successful processing
      channel.ack(msg);

      logger.info('Message processed successfully', {
        messageId: message.id,
        type: message.type,
      });

    } catch (error) {
      logger.error('Error processing message:', error, {
        messageId: msg.properties?.messageId,
        routingKey: msg.fields.routingKey,
      });

      // Reject message and requeue (or send to dead letter queue if configured)
      channel.nack(msg, false, false);
    }
  }

  // Convenience methods for common message types
  registerUserEventHandler(eventType: string, handler: MessageHandler): void {
    this.registerHandler(`user.${eventType}`, handler);
  }

  registerSystemEventHandler(eventType: string, handler: MessageHandler): void {
    this.registerHandler(`system.${eventType}`, handler);
  }

  registerNotificationHandler(notificationType: string, handler: MessageHandler): void {
    this.registerHandler(`notification.${notificationType}`, handler);
  }
}

export const messageConsumer = new MessageConsumerService();