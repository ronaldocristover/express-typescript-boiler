// Mock dependencies first
jest.mock('../../src/application/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    }
  }
}));

jest.mock('../../src/services/cache.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    generateUserKey: jest.fn(),
    generateUsersListKey: jest.fn(),
    generateUserByEmailKey: jest.fn(),
  }
}));

import userRepository from '../../src/repositories/user.repository';
import { cacheService } from '../../src/services/cache.service';
import prisma from '../../src/application/database';
import { CreateUserDTO, UpdateUserDTO, PaginationParams } from '../../src/types/user.types';

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockPrisma = prisma as any;

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const mockUsers = [
      { id: '1', name: 'John Doe', email: 'john@test.com', phone: '123456789', is_active: true, created_at: new Date() },
      { id: '2', name: 'Jane Doe', email: 'jane@test.com', phone: '987654321', is_active: true, created_at: new Date() }
    ];

    it('should return cached users when cache hit', async () => {
      mockCacheService.generateUsersListKey.mockReturnValue('users:list:all');
      mockCacheService.get.mockResolvedValue(mockUsers);

      const result = await userRepository.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockCacheService.get).toHaveBeenCalledWith('users:list:all');
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when cache miss', async () => {
      mockCacheService.generateUsersListKey.mockReturnValue('users:list:all');
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await userRepository.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_active: true,
          created_at: true
        },
        where: { is_active: true },
        orderBy: { created_at: 'desc' }
      });
      expect(mockCacheService.set).toHaveBeenCalledWith('users:list:all', mockUsers, 300);
    });

    it('should handle pagination correctly', async () => {
      const pagination: PaginationParams = { page: 2, limit: 5 };
      mockCacheService.generateUsersListKey.mockReturnValue('users:list:page:2:limit:5');
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await userRepository.findAll(pagination);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_active: true,
          created_at: true
        },
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        skip: 5,
        take: 5
      });
    });
  });

  describe('findById', () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@test.com', phone: '123456789', is_active: true, created_at: new Date() };

    it('should return cached user when cache hit', async () => {
      mockCacheService.generateUserKey.mockReturnValue('user:1');
      mockCacheService.get.mockResolvedValue(mockUser);

      const result = await userRepository.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockCacheService.get).toHaveBeenCalledWith('user:1');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when cache miss', async () => {
      mockCacheService.generateUserKey.mockReturnValue('user:1');
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_active: true,
          created_at: true
        }
      });
      expect(mockCacheService.set).toHaveBeenCalledWith('user:1', mockUser, 900);
    });

    it('should return null when user not found', async () => {
      mockCacheService.generateUserKey.mockReturnValue('user:999');
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userRepository.findById('999');

      expect(result).toBeNull();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@test.com', phone: '123456789', is_active: true, created_at: new Date() };

    it('should return cached user when cache hit', async () => {
      mockCacheService.generateUserByEmailKey.mockReturnValue('user:email:john@test.com');
      mockCacheService.get.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('john@test.com');

      expect(result).toEqual(mockUser);
      expect(mockCacheService.get).toHaveBeenCalledWith('user:email:john@test.com');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache with multiple keys when cache miss', async () => {
      mockCacheService.generateUserByEmailKey.mockReturnValue('user:email:john@test.com');
      mockCacheService.generateUserKey.mockReturnValue('user:1');
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('john@test.com');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@test.com' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_active: true,
          created_at: true
        }
      });
      expect(mockCacheService.set).toHaveBeenCalledWith('user:email:john@test.com', mockUser, 900);
      expect(mockCacheService.set).toHaveBeenCalledWith('user:1', mockUser, 900);
    });
  });

  describe('create', () => {
    const createData: CreateUserDTO = {
      name: 'John Doe',
      email: 'john@test.com',
      password: 'hashedPassword',
      phone: '123456789'
    };

    const mockCreatedUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@test.com',
      phone: '123456789',
      is_active: true,
      created_at: new Date()
    };

    it('should create user and invalidate cache', async () => {
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await userRepository.create(createData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: createData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_active: true,
          created_at: true
        }
      });
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('users:list:*');
    });
  });

  describe('update', () => {
    const userId = '1';
    const updateData: UpdateUserDTO = {
      name: 'Updated Name',
      email: 'updated@test.com'
    };

    const currentUser = { email: 'john@test.com' };
    const updatedUser = {
      id: '1',
      name: 'Updated Name',
      email: 'updated@test.com',
      phone: '123456789',
      is_active: true,
      created_at: new Date()
    };

    it('should update user and invalidate relevant caches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(currentUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      mockCacheService.generateUserKey.mockReturnValue('user:1');
      mockCacheService.generateUserByEmailKey.mockImplementation((email) => `user:email:${email}`);

      const result = await userRepository.update(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_active: true,
          created_at: true
        }
      });
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:1');
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:email:john@test.com');
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:email:updated@test.com');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('users:list:*');
    });
  });

  describe('delete', () => {
    const userId = '1';
    const userToDelete = { email: 'john@test.com' };
    const deletedUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@test.com',
      phone: '123456789',
      is_active: true,
      created_at: new Date()
    };

    it('should delete user and invalidate caches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(userToDelete);
      mockPrisma.user.delete.mockResolvedValue(deletedUser);
      mockCacheService.generateUserKey.mockReturnValue('user:1');
      mockCacheService.generateUserByEmailKey.mockReturnValue('user:email:john@test.com');

      const result = await userRepository.delete(userId);

      expect(result).toEqual(deletedUser);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:1');
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:email:john@test.com');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('users:list:*');
    });
  });

  describe('count', () => {
    it('should return total count of active users', async () => {
      mockPrisma.user.count.mockResolvedValue(42);

      const result = await userRepository.count();

      expect(result).toBe(42);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { is_active: true }
      });
    });
  });

  describe('cache management methods', () => {
    it('should clear user cache', async () => {
      mockCacheService.generateUserKey.mockReturnValue('user:1');

      await userRepository.clearUserCache('1');

      expect(mockCacheService.delete).toHaveBeenCalledWith('user:1');
    });

    it('should clear all users cache', async () => {
      await userRepository.clearAllUsersCache();

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('user:*');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('users:*');
    });
  });
});