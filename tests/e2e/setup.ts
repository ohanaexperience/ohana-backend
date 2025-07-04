/**
 * E2E Test Setup
 * 
 * Global setup and teardown for e2e tests
 */

import { config } from './config';

// Global test timeout for e2e tests (longer than unit tests)
jest.setTimeout(60000); // 60 seconds

// Global setup
beforeAll(() => {
    console.log(`🧪 Starting E2E tests against ${config.stage.toUpperCase()}`);
    console.log(`📍 API Base URL: ${config.apiBaseUrl}`);
    
    if (config.stage === 'local') {
        console.log('⚠️  Running against local development server');
        console.log('   Make sure serverless-offline is running on port 3000');
    } else {
        console.log(`🌐 Running against deployed ${config.stage} environment`);
    }
});

// Global teardown
afterAll(() => {
    console.log('✅ E2E tests completed');
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

export {};