# Testing Guide

## Overview

This directory contains unit and integration tests for the Ohana Backend API.

## Test Structure

```
tests/
├── integration/           # Integration tests (API endpoints with real database)
├── unit/                 # Unit tests (isolated component testing)
├── helpers/              # Test utilities and helper functions
├── __mocks__/            # Mock implementations
└── setup.ts              # Global test setup
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Integration Tests Only
```bash
npm test -- tests/integration
```

### Unit Tests Only
```bash
npm test -- tests/unit
```

## Environment Setup

### Database Configuration

Integration tests require a PostgreSQL database with PostGIS extension. Set these environment variables:

```bash
DB_ENDPOINT=localhost
DB_PORT=5432
DB_NAME=test_db
DB_USER=postgres
DB_PASSWORD=password
```

### Test Database Setup

The integration tests will automatically:
1. Clear the database before each test suite
2. Run migrations and seed initial data
3. Create test users and hosts as needed
4. Clean up after tests complete

## Test Helpers

### DatabaseTestHelper

Provides utilities for database setup and test data creation:

```typescript
import { DatabaseTestHelper } from "../helpers/database.helper";

const dbHelper = new DatabaseTestHelper();
await dbHelper.setupDatabase();

// Create test data
const { user, host } = await dbHelper.createTestUserAndHost();
const experience = await dbHelper.createTestExperience(host.id);

// Cleanup
await dbHelper.teardownDatabase();
```

### ExperienceFactory

Provides pre-built test data for experience creation:

```typescript
import { ExperienceFactory, VALID_EXPERIENCE_DATA } from "../helpers/experience-factory";

// Use pre-built data
const request = ExperienceFactory.createRequestWithAuth(VALID_EXPERIENCE_DATA);

// Create custom data
const customData = ExperienceFactory.createValidExperienceData({
    title: "Custom Experience",
    pricePerPerson: 100,
});
```

## Writing New Tests

### Integration Tests

1. Use `DatabaseTestHelper` for database setup
2. Use `ExperienceFactory` for test data
3. Test the full request/response cycle
4. Verify database state changes

Example:
```typescript
describe("New Endpoint Integration Tests", () => {
    let dbHelper: DatabaseTestHelper;
    let testUser: any;
    let testHost: any;

    beforeAll(async () => {
        dbHelper = new DatabaseTestHelper();
        await dbHelper.setupDatabase();
        const { user, host } = await dbHelper.createTestUserAndHost();
        testUser = user;
        testHost = host;
    });

    afterAll(async () => {
        await dbHelper.teardownDatabase();
    });

    it("should test something", async () => {
        // Test implementation
    });
});
```

### Unit Tests

1. Mock all external dependencies
2. Test individual functions/methods in isolation
3. Focus on business logic and edge cases

Example:
```typescript
jest.mock("@/database");
jest.mock("@/utils");

describe("Service Unit Tests", () => {
    let service: MyService;
    let mockDatabase: jest.Mocked<any>;

    beforeEach(() => {
        mockDatabase = createMockDatabase();
        service = new MyService({ database: mockDatabase });
    });

    it("should test specific behavior", () => {
        // Test implementation
    });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data to prevent test pollution
3. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
4. **Assertions**: Make specific assertions about the expected behavior
5. **Error Cases**: Test both success and failure scenarios
6. **Database State**: Verify database changes in integration tests
7. **Mocking**: Mock external dependencies in unit tests

## Common Patterns

### Testing Authentication
```typescript
(decodeToken as jest.Mock).mockReturnValue({ sub: testUser.id });
```

### Testing Validation Errors
```typescript
const invalidData = ExperienceFactory.createExperienceWithValidationErrors();
const result = await controller.method(invalidData);
expect(result.statusCode).toBe(400);
```

### Testing Database Operations
```typescript
const createdRecord = await dbHelper.createTestExperience(host.id);
const result = await controller.deleteExperience({ experienceId: createdRecord.id });
expect(result.statusCode).toBe(200);

// Verify database state
const deletedRecord = await dbHelper.getDatabase().experiences.getById(createdRecord.id);
expect(deletedRecord).toBeNull();
```