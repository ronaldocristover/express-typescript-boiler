import * as amqp from 'amqplib';
import { logger } from './logging';
import { env } from './env.validation';

class RabbitMQConnection {
  private connection: any = null;
  private channel: any = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      logger.info('Connecting to RabbitMQ...', { url: env.RABBITMQ_URL });

      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(env.RABBITMQ_EXCHANGE, 'topic', {
        durable: true,
      });

      this.isConnected = true;
      logger.info('Successfully connected to RabbitMQ');

      // Handle connection events
      this.connection.on('error', (err: any) => {
        logger.error('RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  getChannel(): any {
    if (!this.channel || !this.isConnected) {
      throw new Error('RabbitMQ channel is not available. Make sure to connect first.');
    }
    return this.channel;
  }

  isReady(): boolean {
    return this.isConnected && this.channel !== null;
  }
}

export const rabbitMQ = new RabbitMQConnection();