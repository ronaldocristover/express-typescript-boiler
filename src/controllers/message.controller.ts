import { Request, Response } from "express";
import { messagePublisher } from "../services/message-publisher.service";
import { logger } from "../application/logging";
import { z } from "zod";

const publishMessageSchema = z.object({
  routingKey: z.string().min(1),
  type: z.string().min(1),
  data: z.any()
});

const publishNotificationSchema = z.object({
  recipientId: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  data: z.any().optional()
});

const publishSystemEventSchema = z.object({
  eventType: z.string().min(1),
  data: z.any()
});

class MessageController {
  async publishMessage(req: Request, res: Response): Promise<void> {
    try {
      const validation = publishMessageSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: "Validation failed",
          details: validation.error.errors
        });
        return;
      }

      const { routingKey, type, data } = validation.data;

      await messagePublisher.publishMessage(routingKey, {
        type,
        data
      });

      logger.info('Message published via API', {
        routingKey,
        type,
        userId: (req as any).user?.id
      });

      res.status(200).json({
        success: true,
        message: "Message published successfully"
      });

    } catch (error) {
      logger.error('Failed to publish message via API:', error);
      res.status(500).json({
        error: "Failed to publish message",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async publishNotification(req: Request, res: Response): Promise<void> {
    try {
      const validation = publishNotificationSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: "Validation failed",
          details: validation.error.errors
        });
        return;
      }

      const { recipientId, type, title, message, data } = validation.data;

      await messagePublisher.publishNotification(recipientId, type, {
        title,
        message,
        ...data
      });

      logger.info('Notification published via API', {
        recipientId,
        type,
        title,
        userId: (req as any).user?.id
      });

      res.status(200).json({
        success: true,
        message: "Notification published successfully"
      });

    } catch (error) {
      logger.error('Failed to publish notification via API:', error);
      res.status(500).json({
        error: "Failed to publish notification",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async publishSystemEvent(req: Request, res: Response): Promise<void> {
    try {
      const validation = publishSystemEventSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: "Validation failed",
          details: validation.error.errors
        });
        return;
      }

      const { eventType, data } = validation.data;

      await messagePublisher.publishSystemEvent(eventType, data);

      logger.info('System event published via API', {
        eventType,
        userId: (req as any).user?.id
      });

      res.status(200).json({
        success: true,
        message: "System event published successfully"
      });

    } catch (error) {
      logger.error('Failed to publish system event via API:', error);
      res.status(500).json({
        error: "Failed to publish system event",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}

export const messageController = new MessageController();