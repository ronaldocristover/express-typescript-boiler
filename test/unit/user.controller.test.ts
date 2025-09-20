import { Request, Response, NextFunction } from 'express';
import userController from '../../src/controllers/user.controller';
import userService from '../../src/services/user.service';
import { CreateUserDTO, UpdateUserDTO } from '../../src/types/user.types';

// Mock dependencies
jest.mock('../../src/services/user.service');

const mockUserService = userService as jest.Mocked<typeof userService>;

describe('UserController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      params: {},
      query: {},
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('findAll', () => {
    const mockUsers = [
      { id: '1', name: 'John Doe', email: 'john@test.com', phone: '123456789', is_active: true, created_at: new Date() },
      { id: '2', name: 'Jane Doe', email: 'jane@test.com', phone: '987654321', is_active: true, created_at: new Date() }
    ];

    it('should return all users without pagination', async () => {
      mockUserService.findAll.mockResolvedValue({ users: mockUsers });

      await userController.findAll(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.findAll).toHaveBeenCalledWith(undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Users retrieved successfully",
        data: mockUsers,
        meta: undefined
      });
    });

    it('should return paginated users with meta data', async () => {
      mockRequest.query = { page: '2', limit: '5' };
      const meta = { page: 2, limit: 5, total: 50, totalPages: 10 };
      mockUserService.findAll.mockResolvedValue({ users: mockUsers, meta });

      await userController.findAll(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.findAll).toHaveBeenCalledWith({ page: 2, limit: 5 });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Users retrieved successfully",
        data: mockUsers,
        meta
      });
    });

    it('should use default pagination values when invalid', async () => {
      mockRequest.query = { page: 'invalid', limit: 'invalid' };
      mockUserService.findAll.mockResolvedValue({ users: mockUsers });

      await userController.findAll(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should call next on error', async () => {
      const error = new Error('Service error');
      mockUserService.findAll.mockRejectedValue(error);

      await userController.findAll(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('find', () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@test.com', phone: '123456789', is_active: true, created_at: new Date() };

    it('should return user by id', async () => {
      mockRequest.params = { id: '1' };
      mockUserService.findOne.mockResolvedValue(mockUser);

      await userController.find(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.findOne).toHaveBeenCalledWith('1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "User retrieved successfully",
        data: mockUser
      });
    });

    it('should call next on error', async () => {
      mockRequest.params = { id: '999' };
      const error = new Error('User not found');
      mockUserService.findOne.mockRejectedValue(error);

      await userController.find(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
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
      mockRequest.body = createUserData;
      mockUserService.create.mockResolvedValue(mockCreatedUser);

      await userController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.create).toHaveBeenCalledWith(createUserData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "User created successfully",
        data: mockCreatedUser
      });
    });

    it('should call next on error', async () => {
      mockRequest.body = createUserData;
      const error = new Error('Email already exists');
      mockUserService.create.mockRejectedValue(error);

      await userController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateUserData: UpdateUserDTO = {
      name: 'Updated Name',
      email: 'updated@test.com'
    };

    const mockUpdatedUser = {
      id: '1',
      name: 'Updated Name',
      email: 'updated@test.com',
      phone: '123456789',
      is_active: true,
      created_at: new Date()
    };

    it('should update user successfully', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = updateUserData;
      mockUserService.update.mockResolvedValue(mockUpdatedUser);

      await userController.update(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.update).toHaveBeenCalledWith('1', updateUserData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "User updated successfully",
        data: mockUpdatedUser
      });
    });

    it('should call next on error', async () => {
      mockRequest.params = { id: '999' };
      mockRequest.body = updateUserData;
      const error = new Error('User not found');
      mockUserService.update.mockRejectedValue(error);

      await userController.update(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove user successfully', async () => {
      mockRequest.params = { id: '1' };
      mockUserService.remove.mockResolvedValue(undefined);

      await userController.remove(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.remove).toHaveBeenCalledWith('1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "User deleted successfully"
      });
    });

    it('should call next on error', async () => {
      mockRequest.params = { id: '999' };
      const error = new Error('User not found');
      mockUserService.remove.mockRejectedValue(error);

      await userController.remove(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});