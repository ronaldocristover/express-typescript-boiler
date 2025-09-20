import { Request, Response, NextFunction } from "express";
import userService from "../services/user.service";
import { logger } from "../application/logging";
import { CreateUserDTO, UpdateUserDTO, ApiResponse, UserResponse, PaginationParams } from "../types/user.types";

class UserController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      let pagination: PaginationParams | undefined;
      if (req.query.page || req.query.limit) {
        pagination = { page, limit };
      }

      const result = await userService.findAll(pagination);
      const response: ApiResponse<UserResponse[]> = {
        success: true,
        message: "Users retrieved successfully",
        data: result.users,
        meta: result.meta
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async find(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const users = await userService.findOne(id);
      const response: ApiResponse<UserResponse> = {
        success: true,
        message: "User retrieved successfully",
        data: users
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload: CreateUserDTO = req.body;
      const newUser = await userService.create(payload);
      logger.info("User created successfully", {
        userId: newUser.id,
      });
      const response: ApiResponse<UserResponse> = {
        success: true,
        message: "User created successfully",
        data: newUser
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const payload: UpdateUserDTO = req.body;
      const { id } = req.params;
      const updatedUser = await userService.update(id, payload);
      const response: ApiResponse<UserResponse> = {
        success: true,
        message: "User updated successfully",
        data: updatedUser
      };
      res.status(200).json(response);
    } catch (e) {
      next(e);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await userService.remove(id);
      const response: ApiResponse<null> = {
        success: true,
        message: "User deleted successfully"
      };
      res.status(200).json(response);
    } catch (e) {
      next(e);
    }
  }
}

export default new UserController();
