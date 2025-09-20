import { Router } from "express";
import { messageController } from "../controllers/message.controller";

const router = Router();

// Publish a custom message
router.post("/publish", messageController.publishMessage);

// Publish a notification
router.post("/notification", messageController.publishNotification);

// Publish a system event
router.post("/system-event", messageController.publishSystemEvent);

export default router;