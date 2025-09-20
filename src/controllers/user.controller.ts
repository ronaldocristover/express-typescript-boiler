import { Request, Response, NextFunction } from "express";
import userService from "../services/user.service";
import { logger } from "../application/logging";

class UserController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.findAll();
      res.status(200).json({
        message: "Users retrieved successfully",
        data: users,
      });
    } catch (error: any) {
      console.error("Error in getAllUsers:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async find(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const users = await userService.findOne(parseInt(id));
      res.status(200).json({
        message: "User retrieved successfully",
        data: users,
      });
    } catch (error: any) {
      console.error(`Error in getUserById for ID ${req.params.id}:`, error);
      if (error.cause === "NOT_FOUND") {
        return res.status(404).json({
          message: error.message,
        });
      }
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      const newUser = await userService.create(payload);
      logger.info("User created successfully", {
        userId: newUser.id,
      });
      res.status(201).json({
        message: "User created successfully",
        data: newUser,
      });
    } catch (error: any) {
      console.error("Error in createUser:", error);
      if (error.cause === "DUPLICATE_EMAIL") {
        return res.status(409).json({
          message: error.message,
        });
      }
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      const { id } = req.params;
      const response = await userService.update(parseInt(id), payload);
      res.status(200).json({
        data: response,
      });
    } catch (e) {
      next(e);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const response = await userService.remove(parseInt(id));
      res.status(200).json({
        data: response,
      });
    } catch (e) {
      next(e);
    }
  }
}

export default new UserController();
