/**
 * E2E Authentication Tests
 * 
 * Tests the complete authentication flow including:
 * - User registration
 * - Email confirmation (automated for testing)
 * - Login/logout
 * - Token refresh
 * - Password reset
 */

import { ApiClient } from './helpers/api-client';
import { AuthHelper, TestUser } from './helpers/auth-helper';
import { TestDataGenerator } from './helpers/test-data-generator';

describe('Authentication E2E Tests', () => {
    let apiClient: ApiClient;
    let authHelper: AuthHelper;

    beforeAll(() => {
        apiClient = new ApiClient();
        authHelper = new AuthHelper(apiClient);
    });

    afterAll(async () => {
        await authHelper.cleanup();
    });

    describe('User Registration', () => {
        it('should register a new user with email', async () => {
            const userData = TestDataGenerator.generateTestUser();

            const response = await apiClient.post('/v1/auth/email/register', {
                email: userData.email,
                password: userData.password,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phoneNumber: userData.phoneNumber,
            });

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message');
            expect(response.data.message).toContain('successfully created');

            // Track for cleanup
            authHelper.getCreatedUsers().push(userData.email);
        });

        it('should not allow duplicate email registration', async () => {
            const userData = TestDataGenerator.generateTestUser();

            // Register once
            await apiClient.post('/v1/auth/email/register', userData);
            authHelper.getCreatedUsers().push(userData.email);

            // Try to register again with same email
            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/auth/email/register', userData);

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toBe('USER_ALREADY_EXISTS');
        });

        it('should validate email format', async () => {
            const userData = TestDataGenerator.generateTestUser();
            userData.email = 'invalid-email';

            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/auth/email/register', userData);

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toBe('INVALID_EMAIL');
        });

        it('should validate password strength', async () => {
            const userData = TestDataGenerator.generateTestUser();
            userData.password = 'weak';

            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/auth/email/register', userData);

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toBe('INVALID_PASSWORD_MIN_LENGTH');
        });
    });

    describe('User Login', () => {
        let testUser: TestUser;

        beforeAll(async () => {
            testUser = await authHelper.registerUser();
        });

        it('should login with valid credentials', async () => {
            const response = await apiClient.post('/v1/auth/email/login', {
                email: testUser.email,
                password: testUser.password,
            });

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('accessToken');
            expect(response.data).toHaveProperty('refreshToken');
            expect(response.data).toHaveProperty('idToken');
            expect(response.data).toHaveProperty('user');
            expect(response.data.user.email).toBe(testUser.email);
        });

        it('should not login with invalid email', async () => {
            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/auth/email/login', {
                email: 'nonexistent@example.com',
                password: testUser.password,
            });

            expect(errorResponse.status).toBe(401);
            expect(errorResponse.data.error).toContain('credentials');
        });

        it('should not login with invalid password', async () => {
            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/auth/email/login', {
                email: testUser.email,
                password: 'wrongpassword',
            });

            expect(errorResponse.status).toBe(401);
            expect(errorResponse.data.error).toContain('credentials');
        });
    });

    describe('Token Refresh', () => {
        let testUser: TestUser;

        beforeAll(async () => {
            testUser = await authHelper.createAndLoginTestUser();
        });

        it('should refresh tokens with valid refresh token', async () => {
            const response = await apiClient.post('/v1/auth/tokens/refresh', {
                refreshToken: testUser.refreshToken,
            });

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('accessToken');
            expect(response.data).toHaveProperty('idToken');
            expect(response.data.accessToken).not.toBe(testUser.accessToken);
        });

        it('should not refresh with invalid refresh token', async () => {
            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/auth/tokens/refresh', {
                refreshToken: 'invalid-refresh-token',
            });

            expect(errorResponse.status).toBe(401);
        });
    });

    describe('Password Reset', () => {
        let testUser: TestUser;

        beforeAll(async () => {
            testUser = await authHelper.registerUser();
        });

        it('should initiate password reset', async () => {
            const response = await apiClient.post('/v1/auth/email/forgot-password', {
                email: testUser.email,
            });

            expect(response.status).toBe(200);
            expect(response.data.message).toContain('code sent');
        });

        it('should handle password reset for non-existent email', async () => {
            const response = await apiClient.post('/v1/auth/email/forgot-password', {
                email: 'nonexistent@example.com',
            });

            // Should return success for security reasons (don't reveal if email exists)
            expect(response.status).toBe(200);
        });
    });

    describe('Protected Routes', () => {
        let testUser: TestUser;

        beforeAll(async () => {
            testUser = await authHelper.createAndLoginTestUser();
        });

        it('should access protected route with valid token', async () => {
            const response = await apiClient.get('/v1/experiences');

            expect(response.status).toBe(200);
        });

        it('should not access protected route without token', async () => {
            apiClient.clearAuthToken();

            const errorResponse = await apiClient.requestWithExpectedError('get', '/v1/experiences');

            expect(errorResponse.status).toBe(401);

            // Restore token for other tests
            apiClient.setAuthToken(testUser.accessToken!);
        });

        it('should not access protected route with invalid token', async () => {
            apiClient.setAuthToken('invalid-token');

            const errorResponse = await apiClient.requestWithExpectedError('get', '/v1/experiences');

            expect(errorResponse.status).toBe(401);

            // Restore token for other tests
            apiClient.setAuthToken(testUser.accessToken!);
        });
    });
});