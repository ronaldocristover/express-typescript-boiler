import userService from '../../src/services/user.service';
import userRepository from '../../src/repositories/user.repository';
import { ResponseError } from '../../src/errors/response-error';
import bcrypt from 'bcrypt';
import { CreateUserDTO, UpdateUserDTO } from '../../src/types/user.types';

// Mock dependencies
jest.mock('../../src/repositories/user.repository');
jest.mock('bcrypt');

const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const mockUsers = [
      { id: '1', name: 'John Doe', email: 'john@test.com', phone: '123456789', is_active: true, created_at: new Date() },
      { id: '2', name: 'Jane Doe', email: 'jane@test.com', phone: '987654321', is_active: true, created_at: new Date() }
    ];

    it('should return all users without pagination', async () => {
      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      const result = await userService.findAll();

      expect(result).toEqual({ users: mockUsers });
      expect(mockUserRepository.findAll).toHaveBeenCalledWith();
    });

    it('should return paginated users with meta data', async () => {
      const pagination = { page: 1, limit: 10 };
      mockUserRepository.findAll.mockResolvedValue(mockUsers);
      mockUserRepository.count.mockResolvedValue(50);

      const result = await userService.findAll(pagination);

      expect(result).toEqual({
        users: mockUsers,
        meta: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5
        }
      });
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(pagination);
      expect(mockUserRepository.count).toHaveBeenCalled();
    });

    it('should throw error for invalid limit', async () => {
      const pagination = { page: 1, limit: 101 };

      await expect(userService.findAll(pagination)).rejects.toThrow(
        new ResponseError(400, "Limit must be between 1 and 100")
      );
    });

    it('should throw error for invalid page', async () => {
      const pagination = { page: 0, limit: 10 };

      await expect(userService.findAll(pagination)).rejects.toThrow(
        new ResponseError(400, "Page must be greater than 0")
      );
    });
  });

  describe('findOne', () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@test.com', phone: '123456789', is_active: true, created_at: new Date() };

    it('should return user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.findOne('1');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.findOne('999')).rejects.toThrow(
        new ResponseError(404, "User not found")
      );
    });
  });

  describe('create', () => {
    const createUserData: CreateUserDTO = {
      name: 'John Doe',
      email: 'john@test.com',
      password: 'password123',
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

    it('should create user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.create(createUserData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(createUserData.email);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(createUserData.password, 12);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...createUserData,
        password: 'hashedPassword'
      });
    });

    it('should throw error when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockCreatedUser);

      await expect(userService.create(createUserData)).rejects.toThrow(
        new ResponseError(409, "Email already exists")
      );
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const userId = '1';
    const updateData: UpdateUserDTO = {
      name: 'Updated Name',
      email: 'updated@test.com',
      password: 'newPassword123'
    };

    const existingUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@test.com',
      phone: '123456789',
      is_active: true,
      created_at: new Date()
    };

    const updatedUser = {
      ...existingUser,
      ...updateData,
      password: 'hashedNewPassword'
    };

    it('should update user successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedNewPassword' as never);
      mockUserRepository.update.mockResolvedValue(updatedUser as any);

      const result = await userService.update(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(updateData.email);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(updateData.password, 12);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        ...updateData,
        password: 'hashedNewPassword'
      });
    });

    it('should update user without password change', async () => {
      const updateWithoutPassword = { name: 'Updated Name' };
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({ ...existingUser, ...updateWithoutPassword } as any);

      await userService.update(userId, updateWithoutPassword);

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateWithoutPassword);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.update(userId, updateData)).rejects.toThrow(
        new ResponseError(404, "User not found")
      );
    });

    it('should throw error when email already exists for another user', async () => {
      const anotherUser = { ...existingUser, id: '2' };
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(anotherUser);

      await expect(userService.update(userId, updateData)).rejects.toThrow(
        new ResponseError(409, "Email already exists")
      );
    });

    it('should allow updating with same email', async () => {
      const updateWithSameEmail = { name: 'Updated Name', email: existingUser.email };
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({ ...existingUser, ...updateWithSameEmail } as any);

      await userService.update(userId, updateWithSameEmail);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateWithSameEmail);
    });
  });

  describe('remove', () => {
    const userId = '1';
    const existingUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@test.com',
      phone: '123456789',
      is_active: true,
      created_at: new Date()
    };

    it('should remove user successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.delete.mockResolvedValue(undefined as any);

      await userService.remove(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.remove(userId)).rejects.toThrow(
        new ResponseError(404, "User not found")
      );
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });
});