import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminDeleteUserCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { v4 as uuidv4 } from "uuid";

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "us-east-1",
});

export function getApiUrl(): string {
    // Use environment variable or default to local/dev URL
    return process.env.API_URL || "https://api-dev.ohana.com";
}

export async function createTestUser(): Promise<{ userId: string; token: string }> {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
        throw new Error("COGNITO_USER_POOL_ID not set");
    }

    const username = `test-user-${Date.now()}@example.com`;
    const password = `TestPassword123!${uuidv4()}`;

    try {
        // Create user in Cognito
        const createUserCommand = new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: username,
            TemporaryPassword: password,
            MessageAction: "SUPPRESS",
            UserAttributes: [
                { Name: "email", Value: username },
                { Name: "email_verified", Value: "true" },
            ],
        });

        const createUserResponse = await cognitoClient.send(createUserCommand);
        const userId = createUserResponse.User?.Username || username;

        // Set permanent password
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: username,
            Password: password,
            Permanent: true,
        });

        await cognitoClient.send(setPasswordCommand);

        // Get auth token (simplified - in real scenario, use proper auth flow)
        // For testing, you might want to use a test token or mock auth
        const token = await getAuthToken(username, password);

        return { userId, token };
    } catch (error) {
        console.error("Failed to create test user:", error);
        throw error;
    }
}

export async function cleanupTestUser(userId: string): Promise<void> {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
        return;
    }

    try {
        const deleteUserCommand = new AdminDeleteUserCommand({
            UserPoolId: userPoolId,
            Username: userId,
        });

        await cognitoClient.send(deleteUserCommand);
    } catch (error) {
        console.error("Failed to delete test user:", error);
    }
}

export async function getAuthToken(username: string, password: string): Promise<string> {
    // In a real implementation, this would authenticate with Cognito
    // and return a JWT token. For testing purposes, you might:
    // 1. Use AWS Amplify Auth
    // 2. Use AWS SDK to call InitiateAuth
    // 3. Use a pre-generated test token
    // 4. Mock the authentication

    // Example with direct Cognito (simplified):
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
        throw new Error("COGNITO_CLIENT_ID not set");
    }

    // This is a placeholder - implement actual Cognito auth
    // For testing, you might want to use a long-lived test token
    return "test-jwt-token";
}

export function generateIdempotencyKey(): string {
    return uuidv4();
}

export async function waitForCondition(
    conditionFn: () => Promise<boolean>,
    timeoutMs: number = 30000,
    intervalMs: number = 1000
): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
        if (await conditionFn()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error("Timeout waiting for condition");
}

export async function makeAuthenticatedRequest(
    url: string,
    options: RequestInit,
    authToken: string
): Promise<Response> {
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json",
        },
    });
}