# End-to-End (E2E) Testing

This directory contains end-to-end tests that test the complete application flow by making actual HTTP requests to your deployed serverless endpoints.

## Overview

E2E tests are different from unit tests because they:
- Make real HTTP requests to your API Gateway endpoints
- Use real AWS services (Cognito, RDS, S3)
- Test the complete user journey from frontend perspective
- Verify that all components work together correctly

## Setup

### 1. Environment Configuration

Copy the example environment file and configure it for your environment:

```bash
cp .env.e2e.example .env.e2e
```

Edit `.env.e2e` with your actual values:

```env
# Test Environment
E2E_STAGE=dev

# API Gateway URL (get from serverless deploy output)
E2E_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev

# Cognito Configuration (get from AWS Console)
E2E_USER_POOL_ID=us-east-1_xxxxxxxxx
E2E_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Get Your API Gateway URL

After deploying with serverless, get your API Gateway URL:

```bash
# Deploy your service
serverless deploy --stage dev

# The output will show your API Gateway URL like:
# endpoints:
#   POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/v1/auth/email/register
#   GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/v1/experiences/public
```

Use the base URL (without the path) in your `.env.e2e` file.

### 3. Get Cognito Configuration

From AWS Console or CloudFormation outputs:

```bash
# Get stack outputs
aws cloudformation describe-stacks --stack-name ohana-dev --query 'Stacks[0].Outputs'

# Look for:
# - UserPoolId
# - UserPoolClientId
```

## Running Tests

### Run all E2E tests against dev environment:
```bash
npm run test:e2e:dev
```

### Run E2E tests against different environments:
```bash
# Against dev environment
npm run test:e2e:dev

# Against staging environment  
npm run test:e2e:staging

# Against local serverless-offline (if you have it set up)
npm run test:e2e:local
```

### Run specific test files:
```bash
# Run only authentication tests
npm run test:e2e:dev -- auth.e2e.test.ts

# Run only experience tests
npm run test:e2e:dev -- experiences.e2e.test.ts
```

### Run with verbose output:
```bash
npm run test:e2e:dev -- --verbose
```

## Test Structure

### Authentication Tests (`auth.e2e.test.ts`)
- User registration with email
- Email confirmation (automated for testing)
- User login/logout
- Token refresh
- Password reset flow
- Protected route access

### Experience Tests (`experiences.e2e.test.ts`)
- Host profile creation and management
- Experience creation (complete and minimal)
- Experience updates and deletion
- Public experience listings
- Authentication and authorization

## Test Data Management

Tests automatically:
- Generate unique test data for each run
- Clean up created users and resources after tests
- Use realistic test data that follows your API schema

### Cleanup

Tests include automatic cleanup, but if needed, you can manually clean up:

```typescript
// In test files, cleanup is handled by AuthHelper
afterAll(async () => {
    await authHelper.cleanup(); // Removes test users and data
});
```

## Debugging

### View test output:
```bash
npm run test:e2e:dev -- --verbose --no-coverage
```

### Debug specific tests:
```bash
# Run single test file with debugging
npm run test:e2e:dev -- --testNamePattern="should register a new user"
```

### Check API responses:
The tests include detailed logging of API requests and responses. Look for:
- 📝 User registration logs
- 🔐 Login attempt logs  
- 🏢 Host profile creation logs
- ✅ Success indicators
- ⚠️ Warning messages
- ❌ Error details

## Common Issues

### 1. API Gateway URL not accessible
- Verify the URL in `.env.e2e` is correct
- Check that your AWS credentials are configured
- Ensure the API Gateway is deployed and publicly accessible

### 2. Cognito permissions
- Verify User Pool ID and Client ID are correct
- Check that the test environment has the right IAM permissions
- Ensure the Cognito User Pool allows admin operations

### 3. Database connection issues
- Verify RDS/database is accessible from Lambda functions
- Check VPC configuration if using private subnets
- Ensure database migrations have been run

### 4. Test timeouts
- E2E tests have longer timeouts (60s) but may still timeout
- Check AWS service limits and cold start times
- Consider increasing timeouts for complex operations

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use unique test data for each test run
- Clean up resources after tests

### 2. Environment Management
- Use separate environments for different test stages
- Don't run E2E tests against production
- Consider using feature flags for test-specific behavior

### 3. Performance
- E2E tests are slower than unit tests
- Run them less frequently (e.g., on PR merge, not every commit)
- Consider parallel test execution for faster CI/CD

### 4. Data Management
- Use realistic test data
- Don't rely on existing data in the environment
- Clean up test data to avoid accumulation

## CI/CD Integration

### GitHub Actions Example:
```yaml
name: E2E Tests
on:
  pull_request:
    branches: [main, development]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      
      - name: Run E2E Tests
        env:
          E2E_API_URL: ${{ secrets.E2E_API_URL }}
          E2E_USER_POOL_ID: ${{ secrets.E2E_USER_POOL_ID }}
          E2E_USER_POOL_CLIENT_ID: ${{ secrets.E2E_USER_POOL_CLIENT_ID }}
        run: npm run test:e2e:staging
```

## Extending Tests

To add new E2E tests:

1. Create new test files following the pattern: `*.e2e.test.ts`
2. Use the existing helpers (`ApiClient`, `AuthHelper`, `TestDataGenerator`)
3. Follow the AAA pattern (Arrange, Act, Assert)
4. Include proper cleanup in `afterAll()` hooks
5. Add descriptive test names and good error messages

Example new test:
```typescript
describe('New Feature E2E Tests', () => {
    let apiClient: ApiClient;
    let authHelper: AuthHelper;

    beforeAll(() => {
        apiClient = new ApiClient();
        authHelper = new AuthHelper(apiClient);
    });

    afterAll(async () => {
        await authHelper.cleanup();
    });

    it('should test new feature', async () => {
        // Arrange
        const user = await authHelper.createAndLoginTestUser();
        
        // Act
        const response = await apiClient.post('/v1/new-feature', { data: 'test' });
        
        // Assert
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('success', true);
    });
});
```