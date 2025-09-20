import userRepository from "../repositories/user.repository";
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserResponse,
  PaginationParams,
  PaginationMeta,
} from "../types/user.types";
import { ResponseError } from "../errors/response-error";
import bcrypt from "bcrypt";
import { messagePublisher } from "./message-publisher.service";
import { logger } from "../application/logging";

class UserService {
  async findAll(
    pagination?: PaginationParams
  ): Promise<{ users: UserResponse[]; meta?: PaginationMeta }> {
    if (pagination) {
      // Validate pagination parameters
      if (pagination.limit < 1 || pagination.limit > 100) {
        throw new ResponseError(400, "Limit must be between 1 and 100");
      }
      if (pagination.page < 1) {
        throw new ResponseError(400, "Page must be greater than 0");
      }

      const [users, total] = await Promise.all([
        userRepository.findAll(pagination),
        userRepository.count(),
      ]);

      const totalPages = Math.ceil(total / pagination.limit);
      const meta: PaginationMeta = {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      };

      return { users, meta };
    }

    const users = await userRepository.findAll();
    return { users };
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ResponseError(404, "User not found");
    }
    return user;
  }

  async create(data: CreateUserDTO): Promise<UserResponse> {
    // Check if email already exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ResponseError(409, "Email already exists");
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const userToCreate = {
      ...data,
      password: hashedPassword,
    };

    const newUser = await userRepository.create(userToCreate);

    // Publish user created event
    try {
      await messagePublisher.publishUserEvent("created", newUser.id, {
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.created_at,
      });
    } catch (error) {
      logger.error("Failed to publish user created event:", error, {
        userId: newUser.id,
      });
    }

    return newUser;
  }

  async update(id: string, data: UpdateUserDTO): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new ResponseError(404, "User not found");
    }

    // If email is being updated, check if it's already taken by another user
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await userRepository.findByEmail(data.email);
      if (emailExists) {
        throw new ResponseError(409, "Email already exists");
      }
    }

    // Hash password if provided
    const updateData = { ...data };
    if (data.password) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(data.password, saltRounds);
    }

    const updatedUser = await userRepository.update(id, updateData);

    // Publish user updated event
    try {
      await messagePublisher.publishUserEvent("updated", updatedUser.id, {
        email: updatedUser.email,
        name: updatedUser.name,
        updated_at: updatedUser.updated_at,
        changes: Object.keys(data),
      });
    } catch (error) {
      logger.error("Failed to publish user updated event:", error, {
        userId: updatedUser.id,
      });
    }

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ResponseError(404, "User not found");
    }

    await userRepository.delete(id);

    // Publish user deleted event
    try {
      await messagePublisher.publishUserEvent("deleted", user.id, {
        email: user.email,
        name: user.name,
        deletedAt: new Date(),
      });
    } catch (error) {
      logger.error("Failed to publish user deleted event:", error, {
        userId: user.id,
      });
    }
  }
}

export default new UserService();
