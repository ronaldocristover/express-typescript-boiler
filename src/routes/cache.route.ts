import express from "express";
import { Request, Response } from "express";
import { cacheService } from "../services/cache.service";
import userRepository from "../repositories/user.repository";
import { logger } from "../application/logging";

const router = express.Router();

// Get cache status
router.get("/status", (req: Request, res: Response) => {
  const status = {
    connected: cacheService.isReady(),
    timestamp: new Date().toISOString()
  };

  res.json({
    success: true,
    message: "Cache status retrieved",
    data: status
  });
});

// Clear all users cache
router.delete("/users", async (req: Request, res: Response) => {
  try {
    if (!cacheService.isReady()) {
      return res.status(503).json({
        success: false,
        message: "Cache service not available"
      });
    }

    await userRepository.clearAllUsersCache();

    res.json({
      success: true,
      message: "Users cache cleared successfully"
    });
  } catch (error) {
    logger.error("Failed to clear users cache:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear users cache"
    });
  }
});

// Clear specific user cache
router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    if (!cacheService.isReady()) {
      return res.status(503).json({
        success: false,
        message: "Cache service not available"
      });
    }

    const { id } = req.params;
    await userRepository.clearUserCache(id);

    res.json({
      success: true,
      message: `User cache cleared for ID: ${id}`
    });
  } catch (error) {
    logger.error("Failed to clear user cache:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear user cache"
    });
  }
});

// Flush entire cache (use with caution)
router.delete("/all", async (req: Request, res: Response) => {
  try {
    if (!cacheService.isReady()) {
      return res.status(503).json({
        success: false,
        message: "Cache service not available"
      });
    }

    await cacheService.flush();

    res.json({
      success: true,
      message: "Entire cache flushed successfully"
    });
  } catch (error) {
    logger.error("Failed to flush cache:", error);
    res.status(500).json({
      success: false,
      message: "Failed to flush cache"
    });
  }
});

export default router;