import prisma from "../application/database";
import {
  CreateUserDTO,
  UpdateUserDTO,
  PaginationParams,
  UserResponse,
} from "../types/user.types";
import { cacheService } from "../services/cache.service";
import { logger } from "../application/logging";
import { CacheKey } from "../utils/cache-key.util";

class UserRepository {
  private userModel = prisma.user;

  async findAll(pagination?: PaginationParams): Promise<UserResponse[]> {
    // Generate cache key using generic utility
    const cacheKey = CacheKey.list("users", pagination, { is_active: true });

    // Try to get from cache first
    const cachedResult = await cacheService.get<UserResponse[]>(cacheKey);
    if (cachedResult) {
      logger.debug("Cache hit for users list", { cacheKey });
      return cachedResult;
    }

    // If not in cache, fetch from database
    const where = { is_active: true };
    const orderBy = { created_at: "desc" as const };
    const select = {
      id: true,
      name: true,
      email: true,
      phone: true,
      is_active: true,
      created_at: true,
    };

    let result: UserResponse[];

    if (pagination) {
      const skip = (pagination.page - 1) * pagination.limit;
      result = await this.userModel.findMany({
        select,
        where,
        orderBy,
        skip,
        take: pagination.limit,
      });
    } else {
      result = await this.userModel.findMany({
        select,
        where,
        orderBy,
      });
    }

    // Cache the result
    await cacheService.set(cacheKey, result, 300); // Cache for 5 minutes
    logger.debug("Cached users list", { cacheKey, count: result.length });

    return result;
  }

  async findById(id: string): Promise<UserResponse | null> {
    // Generate cache key using generic utility
    const cacheKey = CacheKey.byId("user", id);

    // Try to get from cache first
    const cachedResult = await cacheService.get<UserResponse>(cacheKey);
    if (cachedResult) {
      logger.debug("Cache hit for user", { userId: id, cacheKey });
      return cachedResult;
    }

    // If not in cache, fetch from database
    const result = await this.userModel.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_active: true,
        created_at: true,
      },
    });

    if (result) {
      // Cache the result
      await cacheService.set(cacheKey, result, 900); // Cache for 15 minutes
      logger.debug("Cached user", { userId: id, cacheKey });
    }

    return result;
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    // Generate cache key using generic utility
    const cacheKey = CacheKey.byField("user", "email", email);

    // Try to get from cache first
    const cachedResult = await cacheService.get<UserResponse>(cacheKey);
    if (cachedResult) {
      logger.debug("Cache hit for user by email", { email, cacheKey });
      return cachedResult;
    }

    // If not in cache, fetch from database
    const result = await this.userModel.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_active: true,
        created_at: true,
      },
    });

    if (result) {
      // Cache the result with multiple keys for different access patterns
      await cacheService.set(cacheKey, result, 900); // Cache for 15 minutes
      await cacheService.set(CacheKey.byId("user", result.id), result, 900);
      logger.debug("Cached user by email", {
        email,
        userId: result.id,
        cacheKey,
      });
    }

    return result;
  }

  async create(data: CreateUserDTO): Promise<UserResponse> {
    const result = await this.userModel.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_active: true,
        created_at: true,
      },
    });

    // Invalidate users list cache when new user is created
    await this.invalidateUsersListCache();
    logger.debug("Cache invalidated after user creation", {
      userId: result.id,
    });

    return result;
  }

  async update(id: string, data: UpdateUserDTO): Promise<UserResponse> {
    // Get current user data to invalidate email-based cache if email is changing
    const currentUser = await this.userModel.findUnique({
      where: { id },
      select: { email: true },
    });

    const result = await this.userModel.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_active: true,
        created_at: true,
      },
    });

    // Invalidate user-specific cache
    await this.invalidateUserCache(id, currentUser?.email, result.email);

    // Invalidate users list cache since user data changed
    await this.invalidateUsersListCache();

    logger.debug("Cache invalidated after user update", { userId: id });

    return result;
  }

  async delete(id: string): Promise<UserResponse> {
    // Get user data before deletion to invalidate email-based cache
    const userToDelete = await this.userModel.findUnique({
      where: { id },
      select: { email: true },
    });

    const result = await this.userModel.delete({ where: { id } });

    // Invalidate user-specific cache
    if (userToDelete) {
      await this.invalidateUserCache(id, userToDelete.email);
    }

    // Invalidate users list cache since user was deleted
    await this.invalidateUsersListCache();

    logger.debug("Cache invalidated after user deletion", { userId: id });

    return result;
  }

  async count(): Promise<number> {
    return this.userModel.count({
      where: {
        is_active: true,
      },
    });
  }

  // Cache invalidation helper methods
  private async invalidateUserCache(
    userId: string,
    oldEmail?: string,
    newEmail?: string
  ): Promise<void> {
    const promises: Promise<boolean>[] = [];

    // Invalidate user ID-based cache
    promises.push(cacheService.delete(CacheKey.byId("user", userId)));

    // Invalidate old email-based cache if provided
    if (oldEmail) {
      promises.push(
        cacheService.delete(CacheKey.byField("user", "email", oldEmail))
      );
    }

    // Invalidate new email-based cache if different from old email
    if (newEmail && newEmail !== oldEmail) {
      promises.push(
        cacheService.delete(CacheKey.byField("user", "email", newEmail))
      );
    }

    await Promise.all(promises);
  }

  private async invalidateUsersListCache(): Promise<void> {
    // Invalidate all users list cache patterns
    await cacheService.deletePattern(CacheKey.pattern("users", "list:*"));
  }

  // Cache management methods
  async clearUserCache(userId: string): Promise<void> {
    await cacheService.delete(CacheKey.byId("user", userId));
    logger.debug("Cleared cache for user", { userId });
  }

  async clearAllUsersCache(): Promise<void> {
    await cacheService.deletePattern(CacheKey.pattern("user"));
    await cacheService.deletePattern(CacheKey.pattern("users"));
    logger.info("Cleared all users cache");
  }
}

export default new UserRepository();
