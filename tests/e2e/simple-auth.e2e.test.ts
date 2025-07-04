/**
 * Simple Authentication E2E Test
 * 
 * Tests basic registration without requiring Cognito admin operations
 */

import { ApiClient } from './helpers/api-client';
import { TestDataGenerator } from './helpers/test-data-generator';

describe('Simple Authentication E2E Tests', () => {
    let apiClient: ApiClient;

    beforeAll(() => {
        apiClient = new ApiClient();
    });

    describe('User Registration Flow', () => {
        it('should register a new user successfully', async () => {
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
            
            console.log(`✅ User registered successfully: ${userData.email}`);
        });

        it('should validate input data correctly', async () => {
            const userData = TestDataGenerator.generateTestUser();
            userData.email = 'invalid-email'; // Invalid email format

            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/auth/email/register', userData);

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toBe('INVALID_EMAIL');
            
            console.log('✅ Email validation working correctly');
        });

        it('should handle password validation', async () => {
            const userData = TestDataGenerator.generateTestUser();
            userData.password = 'weak'; // Too weak password

            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/auth/email/register', userData);

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toBe('INVALID_PASSWORD_MIN_LENGTH');
            
            console.log('✅ Password validation working correctly');
        });
    });

    describe('Public Endpoints', () => {
        it('should access public experiences endpoint', async () => {
            const response = await apiClient.get('/v1/experiences/public');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            
            console.log(`✅ Public experiences endpoint accessible - Found ${response.data.length} experiences`);
        });

        it('should access public categories endpoint', async () => {
            const response = await apiClient.get('/v1/categories/public');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            
            console.log(`✅ Public categories endpoint accessible - Found ${response.data.length} categories`);
        });
    });

    describe('Protected Endpoints', () => {
        it('should reject access to protected endpoints without authentication', async () => {
            const errorResponse = await apiClient.requestWithExpectedError('get', '/v1/experiences');

            expect(errorResponse.status).toBe(401);
            
            console.log('✅ Protected endpoints properly secured');
        });

        it('should reject access to host endpoints without authentication', async () => {
            const errorResponse = await apiClient.requestWithExpectedError('get', '/v1/host/profile');

            expect(errorResponse.status).toBe(401);
            
            console.log('✅ Host endpoints properly secured');
        });
    });
});