/**
 * E2E Experience Tests
 * 
 * Tests the complete experience lifecycle including:
 * - Creating host profiles
 * - Creating experiences
 * - Updating experiences
 * - Deleting experiences
 * - Public experience listings
 * - Host experience management
 */

import { ApiClient } from './helpers/api-client';
import { AuthHelper, TestUser } from './helpers/auth-helper';
import { TestDataGenerator } from './helpers/test-data-generator';

describe('Experience E2E Tests', () => {
    let apiClient: ApiClient;
    let authHelper: AuthHelper;
    let hostUser: TestUser;
    let regularUser: TestUser;

    beforeAll(async () => {
        apiClient = new ApiClient();
        authHelper = new AuthHelper(apiClient);

        // Create a host user
        hostUser = await authHelper.createAndLoginTestUser();
        await authHelper.createHostProfile();

        // Create a regular user
        regularUser = await authHelper.createAndLoginTestUser();
    });

    afterAll(async () => {
        await authHelper.cleanup();
    });

    describe('Host Profile Management', () => {
        beforeEach(async () => {
            // Login as host user
            await authHelper.loginUser(hostUser.email, hostUser.password);
        });

        it('should get host profile', async () => {
            const response = await apiClient.get('/v1/host/profile');

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('businessName');
            expect(response.data).toHaveProperty('hostingExperience');
            expect(response.data).toHaveProperty('specialties');
        });

        it('should update host profile', async () => {
            const updateData = {
                bio: 'Updated bio for testing',
                specialties: ['adventure', 'cultural'],
                languages: ['en', 'fr'],
            };

            const response = await apiClient.put('/v1/host/profile', updateData);

            expect(response.status).toBe(200);
            expect(response.data.bio).toBe(updateData.bio);
            expect(response.data.specialties).toEqual(updateData.specialties);
        });
    });

    describe('Experience Creation', () => {
        beforeEach(async () => {
            // Login as host user
            await authHelper.loginUser(hostUser.email, hostUser.password);
        });

        it('should create a complete experience', async () => {
            const experienceData = TestDataGenerator.generateTestExperience();

            const response = await apiClient.post('/v1/host/experiences', experienceData);

            expect(response.status).toBe(201);
            expect(response.data).toHaveProperty('createdExperience');
            expect(response.data).toHaveProperty('uploadUrls');
            expect(response.data.createdExperience.title).toBe(experienceData.title);
            expect(response.data.createdExperience.hostId).toBe(hostUser.userId);
            expect(response.data.createdExperience.pricePerPerson).toBe(experienceData.pricePerPerson);
        });

        it('should create a minimal experience', async () => {
            const experienceData = TestDataGenerator.generateMinimalExperience();

            const response = await apiClient.post('/v1/host/experiences', experienceData);

            expect(response.status).toBe(201);
            expect(response.data.createdExperience.title).toBe(experienceData.title);
            expect(response.data.createdExperience.groupDiscountsEnabled).toBe(false);
            expect(response.data.createdExperience.earlyBirdEnabled).toBe(false);
        });

        it('should not create experience with invalid data', async () => {
            const invalidData = TestDataGenerator.generateInvalidExperience();

            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/host/experiences', invalidData);

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toBeDefined();
        });

        it('should not create experience with invalid category', async () => {
            const experienceData = TestDataGenerator.generateTestExperience();
            experienceData.category.mainId = 999; // Invalid category

            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/host/experiences', experienceData);

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toContain('CATEGORY');
        });

        it('should not allow non-host to create experience', async () => {
            // Login as regular user (not a host)
            await authHelper.loginUser(regularUser.email, regularUser.password);

            const experienceData = TestDataGenerator.generateTestExperience();

            const errorResponse = await apiClient.requestWithExpectedError('post', '/v1/host/experiences', experienceData);

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toContain('HOST_NOT_FOUND');
        });
    });

    describe('Experience Management', () => {
        let createdExperienceId: string;

        beforeAll(async () => {
            // Login as host and create a test experience
            await authHelper.loginUser(hostUser.email, hostUser.password);
            
            const experienceData = TestDataGenerator.generateTestExperience();
            const response = await apiClient.post('/v1/host/experiences', experienceData);
            createdExperienceId = response.data.createdExperience.id;
        });

        beforeEach(async () => {
            // Ensure we're logged in as host
            await authHelper.loginUser(hostUser.email, hostUser.password);
        });

        it('should get host experiences', async () => {
            const response = await apiClient.get('/v1/host/experiences');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);
            expect(response.data.some((exp: any) => exp.id === createdExperienceId)).toBe(true);
        });

        it('should update experience', async () => {
            const updateData = {
                title: 'Updated Experience Title',
                pricePerPerson: 150,
                description: 'Updated description for the experience',
            };

            const response = await apiClient.put(`/v1/host/experiences/${createdExperienceId}`, updateData);

            expect(response.status).toBe(200);
            expect(response.data.title).toBe(updateData.title);
            expect(response.data.pricePerPerson).toBe(updateData.pricePerPerson);
            expect(response.data.description).toBe(updateData.description);
        });

        it('should not update non-existent experience', async () => {
            const updateData = { title: 'Updated Title' };

            const errorResponse = await apiClient.requestWithExpectedError(
                'put',
                '/v1/host/experiences/non-existent-id',
                updateData
            );

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toContain('EXPERIENCE_NOT_FOUND');
        });

        it('should not allow non-owner to update experience', async () => {
            // Create another host
            const anotherHost = await authHelper.createAndLoginTestUser();
            await authHelper.createHostProfile();

            const updateData = { title: 'Unauthorized Update' };

            const errorResponse = await apiClient.requestWithExpectedError(
                'put',
                `/v1/host/experiences/${createdExperienceId}`,
                updateData
            );

            expect(errorResponse.status).toBe(403);
            expect(errorResponse.data.error).toContain('UNAUTHORIZED');
        });

        it('should delete experience', async () => {
            // Create a new experience to delete
            const experienceData = TestDataGenerator.generateMinimalExperience();
            const createResponse = await apiClient.post('/v1/host/experiences', experienceData);
            const experienceToDelete = createResponse.data.createdExperience.id;

            const response = await apiClient.delete(`/v1/host/experiences/${experienceToDelete}`);

            expect(response.status).toBe(200);
            expect(response.data.message).toContain('deleted');
        });

        it('should not delete non-existent experience', async () => {
            const errorResponse = await apiClient.requestWithExpectedError(
                'delete',
                '/v1/host/experiences/non-existent-id'
            );

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toContain('EXPERIENCE_NOT_FOUND');
        });
    });

    describe('Public Experience Listings', () => {
        beforeAll(async () => {
            // Create some public experiences
            await authHelper.loginUser(hostUser.email, hostUser.password);
            
            // Create multiple experiences for testing
            const experience1 = TestDataGenerator.generateTestExperience();
            const experience2 = TestDataGenerator.generateMinimalExperience();
            
            await apiClient.post('/v1/host/experiences', experience1);
            await apiClient.post('/v1/host/experiences', experience2);
        });

        it('should get public experiences without authentication', async () => {
            // Clear auth token to test public access
            apiClient.clearAuthToken();

            const response = await apiClient.get('/v1/experiences/public');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);

            // Verify structure of returned experiences
            const experience = response.data[0];
            expect(experience).toHaveProperty('id');
            expect(experience).toHaveProperty('title');
            expect(experience).toHaveProperty('pricePerPerson');
            expect(experience).toHaveProperty('category');
            expect(experience).toHaveProperty('hostId');
        });

        it('should filter experiences by category', async () => {
            const response = await apiClient.get('/v1/experiences/public?categoryId=1');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            
            // All returned experiences should have categoryId 1
            response.data.forEach((exp: any) => {
                expect(exp.categoryId).toBe(1);
            });
        });

        it('should filter experiences by price range', async () => {
            const response = await apiClient.get('/v1/experiences/public?minPrice=50&maxPrice=100');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            
            // All returned experiences should be within price range
            response.data.forEach((exp: any) => {
                expect(exp.pricePerPerson).toBeGreaterThanOrEqual(50);
                expect(exp.pricePerPerson).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('User Experience Views', () => {
        beforeEach(async () => {
            // Login as regular user
            await authHelper.loginUser(regularUser.email, regularUser.password);
        });

        it('should get experiences for authenticated user', async () => {
            const response = await apiClient.get('/v1/experiences');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
            
            // Authenticated users might see additional data or personalized results
            if (response.data.length > 0) {
                const experience = response.data[0];
                expect(experience).toHaveProperty('id');
                expect(experience).toHaveProperty('title');
            }
        });

        it('should not access host-specific endpoints as regular user', async () => {
            const errorResponse = await apiClient.requestWithExpectedError('get', '/v1/host/experiences');

            expect(errorResponse.status).toBe(400);
            expect(errorResponse.data.error).toContain('HOST_NOT_FOUND');
        });
    });
});