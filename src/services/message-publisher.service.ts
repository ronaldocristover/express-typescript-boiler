import { rabbitMQ } from '../application/rabbitmq';
import { logger } from '../application/logging';
import { env } from '../application/env.validation';

export interface MessagePayload {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  source: string;
}

export class MessagePublisherService {
  async publishMessage(
    routingKey: string,
    message: Omit<MessagePayload, 'id' | 'timestamp' | 'source'>
  ): Promise<void> {
    try {
      if (!rabbitMQ.isReady()) {
        throw new Error('RabbitMQ is not connected');
      }

      const channel = rabbitMQ.getChannel();

      const payload: MessagePayload = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        source: env.APP_NAME,
        ...message,
      };

      const messageBuffer = Buffer.from(JSON.stringify(payload));

      const published = channel.publish(
        env.RABBITMQ_EXCHANGE,
        routingKey,
        messageBuffer,
        {
          persistent: true,
          messageId: payload.id,
          timestamp: payload.timestamp.getTime(),
          contentType: 'application/json',
        }
      );

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

      logger.info('Message published successfully', {
        messageId: payload.id,
        routingKey,
        type: payload.type,
      });

    } catch (error) {
      logger.error('Failed to publish message:', error, {
        routingKey,
        messageType: message.type,
      });
      throw error;
    }
  }

  async publishUserEvent(eventType: string, userId: string, data: any): Promise<void> {
    await this.publishMessage(`user.${eventType}`, {
      type: `user.${eventType}`,
      data: {
        userId,
        ...data,
      },
    });
  }

  async publishSystemEvent(eventType: string, data: any): Promise<void> {
    await this.publishMessage(`system.${eventType}`, {
      type: `system.${eventType}`,
      data,
    });
  }

  async publishNotification(
    recipientId: string,
    notificationType: string,
    data: any
  ): Promise<void> {
    await this.publishMessage(`notification.${notificationType}`, {
      type: `notification.${notificationType}`,
      data: {
        recipientId,
        ...data,
      },
    });
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const messagePublisher = new MessagePublisherService();