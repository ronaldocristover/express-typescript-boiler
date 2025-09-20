import supertest from "supertest";
import app from "../../src/app";
import { logger } from "../../src/application/logging";
import { UserTest } from "../test-util";

describe('User API E2E Tests', () => {
  describe('POST /api/users (Create User)', () => {
    beforeEach(async () => {
      // Clean up any existing test data
      await UserTest.delete();
    });

    afterEach(async () => {
      await UserTest.delete();
    });

    it('should create a new user with valid data', async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        password: "password123"
      };

      const response = await supertest(app)
        .post("/api/users")
        .send(userData);

      logger.debug(response.body);
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.phone).toBe(userData.phone);
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.is_active).toBe(true);
      expect(response.body.data.created_at).toBeDefined();
    });

    it('should reject user creation with invalid data', async () => {
      const response = await supertest(app)
        .post("/api/users")
        .send({
          name: "",
          email: "invalid-email",
          phone: "",
          password: "123"
        });

      logger.debug(response.body);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject user creation with missing fields', async () => {
      const response = await supertest(app)
        .post("/api/users")
        .send({
          name: "John Doe"
        });

      logger.debug(response.body);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject user creation with duplicate email', async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        password: "password123"
      };

      // Create first user
      await supertest(app)
        .post("/api/users")
        .send(userData);

      // Try to create user with same email
      const response = await supertest(app)
        .post("/api/users")
        .send({
          ...userData,
          name: "Jane Doe"
        });

      logger.debug(response.body);
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users (Get All Users)', () => {
    beforeEach(async () => {
      // Create test user
      await UserTest.create();
    });

    afterEach(async () => {
      await UserTest.delete();
    });

    it('should get all users without pagination', async () => {
      const response = await supertest(app)
        .get("/api/users");

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].password).toBeUndefined(); // Password should not be returned
    });

    it('should get paginated users', async () => {
      const response = await supertest(app)
        .get("/api/users?page=1&limit=10");

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
      expect(response.body.meta.total).toBeGreaterThan(0);
      expect(response.body.meta.totalPages).toBeGreaterThan(0);
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await supertest(app)
        .get("/api/users?page=-1&limit=101");

      logger.debug(response.body);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id (Get User by ID)', () => {
    let userId: string;

    beforeEach(async () => {
      await UserTest.create();
      const user = await UserTest.get();
      userId = user.id;
    });

    afterEach(async () => {
      await UserTest.delete();
    });

    it('should get user by valid ID', async () => {
      const response = await supertest(app)
        .get(`/api/users/${userId}`);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.name).toBe("Test User");
      expect(response.body.data.email).toBe("test@example.com");
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
    });

    it('should return 404 for non-existent user ID', async () => {
      const response = await supertest(app)
        .get("/api/users/00000000-0000-0000-0000-000000000000");

      logger.debug(response.body);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid ID format', async () => {
      const response = await supertest(app)
        .get("/api/users/123");

      logger.debug(response.body);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id (Update User)', () => {
    let userId: string;

    beforeEach(async () => {
      await UserTest.create();
      const user = await UserTest.get();
      userId = user.id;
    });

    afterEach(async () => {
      await UserTest.delete();
    });

    it('should update user with valid data', async () => {
      const updateData = {
        name: "Updated Name",
        phone: "9876543210"
      };

      const response = await supertest(app)
        .put(`/api/users/${userId}`)
        .send(updateData);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.phone).toBe(updateData.phone);
      expect(response.body.data.email).toBe("test@example.com"); // Should remain unchanged
    });

    it('should update user password', async () => {
      const response = await supertest(app)
        .put(`/api/users/${userId}`)
        .send({
          password: "newpassword123"
        });

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject update with invalid data', async () => {
      const response = await supertest(app)
        .put(`/api/users/${userId}`)
        .send({
          email: "invalid-email",
          phone: ""
        });

      logger.debug(response.body);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await supertest(app)
        .put("/api/users/00000000-0000-0000-0000-000000000000")
        .send({
          name: "Updated Name"
        });

      logger.debug(response.body);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/:id (Delete User)', () => {
    let userId: string;

    beforeEach(async () => {
      await UserTest.create();
      const user = await UserTest.get();
      userId = user.id;
    });

    afterEach(async () => {
      await UserTest.delete();
    });

    it('should delete user by valid ID', async () => {
      const response = await supertest(app)
        .delete(`/api/users/${userId}`);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user is deleted
      const getResponse = await supertest(app)
        .get(`/api/users/${userId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent user', async () => {
      const response = await supertest(app)
        .delete("/api/users/00000000-0000-0000-0000-000000000000");

      logger.debug(response.body);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('User API Integration Workflow', () => {
    beforeEach(async () => {
      // Clean up any existing test data
      await UserTest.delete();
    });

    afterEach(async () => {
      // Clean up any users created during the test
      await UserTest.delete();
    });

    it('should complete full CRUD workflow', async () => {
      // 1. Create user
      const createData = {
        name: "Integration Test User",
        email: "integration@example.com",
        phone: "5555555555",
        password: "testpassword"
      };

      const createResponse = await supertest(app)
        .post("/api/users")
        .send(createData);

      expect(createResponse.status).toBe(201);
      const userId = createResponse.body.data.id;

      // 2. Get created user
      const getResponse = await supertest(app)
        .get(`/api/users/${userId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.email).toBe(createData.email);

      // 3. Update user
      const updateResponse = await supertest(app)
        .put(`/api/users/${userId}`)
        .send({
          name: "Updated Integration User"
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe("Updated Integration User");

      // 4. Delete user
      const deleteResponse = await supertest(app)
        .delete(`/api/users/${userId}`);

      expect(deleteResponse.status).toBe(200);

      // 5. Verify deletion
      const getAfterDeleteResponse = await supertest(app)
        .get(`/api/users/${userId}`);

      expect(getAfterDeleteResponse.status).toBe(404);
    });

    it('should handle duplicate email scenario', async () => {
      const userData = {
        name: "Duplicate Test",
        email: "duplicate@example.com",
        phone: "1111111111",
        password: "password"
      };

      // Create first user
      const firstResponse = await supertest(app)
        .post("/api/users")
        .send(userData);

      expect(firstResponse.status).toBe(201);

      // Try to create another user with same email
      const duplicateResponse = await supertest(app)
        .post("/api/users")
        .send({
          ...userData,
          name: "Another User"
        });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.success).toBe(false);
    });
  });
});