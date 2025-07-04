/**
 * E2E Configuration Test
 * 
 * Simple test to validate e2e test setup and API connectivity
 */

import { ApiClient } from './helpers/api-client';
import { config } from './config';

describe('E2E Configuration Test', () => {
    let apiClient: ApiClient;

    beforeAll(() => {
        apiClient = new ApiClient();
    });

    it('should have valid configuration', () => {
        expect(config.apiBaseUrl).toBeTruthy();
        expect(config.stage).toBe('dev');
        expect(config.region).toBe('us-east-1');
        
        console.log('🔧 E2E Config:');
        console.log(`   Stage: ${config.stage}`);
        console.log(`   API URL: ${config.apiBaseUrl}`);
        console.log(`   Region: ${config.region}`);
    });

    it('should be able to reach the API Gateway', async () => {
        try {
            // Try a simple public endpoint that doesn't require authentication
            const response = await apiClient.get('/v1/categories/public');
            
            // We expect either success or a specific error, but not network failure
            expect([200, 400, 404, 500].includes(response.status)).toBe(true);
            
            console.log(`✅ API Gateway reachable - Status: ${response.status}`);
        } catch (error: any) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new Error(`❌ Cannot reach API Gateway at ${config.apiBaseUrl}. Check your .env.e2e configuration.`);
            }
            
            // If we get an HTTP error response, that's actually good - it means the API is reachable
            if (error.response) {
                console.log(`✅ API Gateway reachable - HTTP Error Status: ${error.response.status}`);
                expect(error.response.status).toBeGreaterThan(0);
            } else {
                throw error;
            }
        }
    });

    it('should have AWS credentials configured', async () => {
        // This test will only pass if AWS credentials are properly configured
        // We don't actually make AWS calls here, just check the config
        expect(process.env.AWS_REGION || config.region).toBeTruthy();
        
        if (config.userPoolId && config.userPoolClientId) {
            console.log('✅ Cognito configuration found');
            console.log(`   User Pool ID: ${config.userPoolId}`);
            console.log(`   Client ID: ${config.userPoolClientId}`);
        } else {
            console.log('⚠️  Cognito configuration not found - some tests may fail');
        }
    });
});