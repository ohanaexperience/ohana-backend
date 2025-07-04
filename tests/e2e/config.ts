/**
 * E2E Test Configuration
 * 
 * This configuration allows running tests against different environments:
 * - Local (serverless-offline)
 * - Dev (deployed to AWS dev stage)
 * - Staging (deployed to AWS staging stage)
 */

export interface E2EConfig {
    apiBaseUrl: string;
    stage: string;
    region: string;
    userPoolId?: string;
    userPoolClientId?: string;
}

const getConfig = (): E2EConfig => {
    const stage = process.env.E2E_STAGE || 'dev';
    const region = process.env.AWS_REGION || 'us-east-1';

    switch (stage) {
        case 'local':
            return {
                apiBaseUrl: 'http://localhost:3000',
                stage: 'local',
                region,
            };
        
        case 'dev':
            return {
                apiBaseUrl: process.env.E2E_API_URL || `https://api-dev.yourdomain.com`, // Replace with your actual API Gateway URL
                stage: 'dev',
                region,
                userPoolId: process.env.E2E_USER_POOL_ID,
                userPoolClientId: process.env.E2E_USER_POOL_CLIENT_ID,
            };
        
        case 'staging':
            return {
                apiBaseUrl: process.env.E2E_API_URL || `https://api-staging.yourdomain.com`, // Replace with your actual API Gateway URL
                stage: 'staging',
                region,
                userPoolId: process.env.E2E_USER_POOL_ID,
                userPoolClientId: process.env.E2E_USER_POOL_CLIENT_ID,
            };
        
        default:
            throw new Error(`Unknown stage: ${stage}. Use 'local', 'dev', or 'staging'`);
    }
};

export const config = getConfig();

console.log(`🧪 E2E Tests running against: ${config.stage.toUpperCase()} (${config.apiBaseUrl})`);