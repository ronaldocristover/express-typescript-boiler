# Testing Guide

This document provides a comprehensive guide for running and understanding the test suite for the user modules.

## Test Structure

```
test/
├── unit/                    # Unit tests
│   ├── user.service.test.ts    # Service layer tests
│   ├── user.repository.test.ts # Repository layer tests
│   └── user.controller.test.ts # Controller layer tests
├── e2e/                     # End-to-end tests
│   └── user.e2e.test.ts        # Full API workflow tests
├── user.test.ts            # Legacy integration tests
├── address.test.ts         # Address-related tests
├── contact.test.ts         # Contact-related tests
├── test-util.ts           # Test utilities
└── setup.ts               # Test setup and teardown
```

## Test Types

### Unit Tests
- **Service Tests**: Test business logic in isolation with mocked dependencies
- **Repository Tests**: Test data access layer with mocked database
- **Controller Tests**: Test HTTP layer with mocked services

### End-to-End Tests
- Test complete API workflows
- Use real database connections
- Test authentication flows
- Validate response formats

## Running Tests

### All Tests
```bash
npm test                 # Run all tests
npm run test:coverage    # Run with coverage report
```

### Specific Test Types
```bash
npm run test:unit        # Run only unit tests
npm run test:e2e         # Run only end-to-end tests
```

### Development
```bash
npm run test:watch       # Run tests in watch mode
```

### Database Setup for Tests
```bash
npm run db:test:setup    # Set up test database
npm run db:test:reset    # Reset test database
npm run db:test:seed     # Seed test database
```

## Test Configuration

### Environment Variables
Tests use `.env.test` configuration:
- Separate test database
- Disabled external services (Redis, Loki)
- Relaxed rate limiting
- Test-specific JWT secrets

### Jest Configuration
- **Preset**: ts-jest for TypeScript support
- **Environment**: Node.js
- **Test Timeout**: 30 seconds
- **Max Workers**: 1 (for database consistency)
- **Coverage Threshold**: 80% minimum

## Test Patterns

### Unit Test Example
```typescript
describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user successfully', async () => {
    // Arrange
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue(mockUser);

    // Act
    const result = await userService.create(userData);

    // Assert
    expect(result).toEqual(mockUser);
    expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
  });
});
```

### E2E Test Example
```typescript
describe('POST /api/users', () => {
  afterEach(async () => {
    await UserTest.delete();
  });

  it('should register new user', async () => {
    const response = await supertest(web)
      .post("/api/users")
      .send(userData);

    expect(response.status).toBe(200);
    expect(response.body.data.username).toBe(userData.username);
  });
});
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- **HTML Report**: `coverage/lcov-report/index.html`
- **Text Summary**: Displayed in terminal
- **Minimum Thresholds**: 80% for branches, functions, lines, and statements

## Test Utilities

### UserTest Class
Provides helper methods for user-related test data:
```typescript
await UserTest.create();    // Create test user
await UserTest.delete();    // Clean up test user
const user = await UserTest.get(); // Get test user
```

### Mock Services
All external dependencies are mocked in unit tests:
- Database (Prisma)
- Cache (Redis)
- Bcrypt for password hashing

## Best Practices

### Unit Tests
1. Mock all external dependencies
2. Test business logic in isolation
3. Use descriptive test names
4. Test both success and error cases
5. Maintain high test coverage

### E2E Tests
1. Test complete user workflows
2. Use real database for integration
3. Clean up test data after each test
4. Test authentication and authorization
5. Validate response formats and status codes

### Database Tests
1. Use transactions when possible
2. Clean up data after each test
3. Use separate test database
4. Avoid dependencies between tests

## Debugging Tests

### Common Issues
1. **Database Connection**: Ensure test database is running
2. **Port Conflicts**: Tests use port 8889 by default
3. **Race Conditions**: Tests run sequentially with `--runInBand`
4. **Cache Issues**: Cache is flushed between tests

### Debug Mode
```bash
# Run specific test file
npx jest test/unit/user.service.test.ts

# Run with verbose output
npx jest --verbose

# Run single test
npx jest --testNamePattern="should create user successfully"
```

## CI/CD Integration

Tests are designed to work in CI environments:
- No external service dependencies (Redis optional)
- Configurable database connections
- Comprehensive error handling
- Detailed logging for debugging

## Performance

- Unit tests: ~50-100ms each
- E2E tests: ~500-2000ms each
- Full test suite: ~30-60 seconds
- Coverage generation: +10-20 seconds

## Future Improvements

1. Add property-based testing with faker.js
2. Implement database seeding strategies
3. Add performance benchmarking
4. Implement visual regression testing
5. Add contract testing for API endpoints