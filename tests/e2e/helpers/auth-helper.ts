import {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    AdminConfirmSignUpCommand,
    AdminDeleteUserCommand,
    InitiateAuthCommand,
    AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { config } from '../config';
import { ApiClient } from './api-client';
import { TestDataGenerator } from './test-data-generator';

export interface TestUser {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    userId?: string;
}

export class AuthHelper {
    private cognitoClient: CognitoIdentityProviderClient;
    private apiClient: ApiClient;
    private createdUsers: string[] = []; // Track users for cleanup

    constructor(apiClient: ApiClient) {
        this.apiClient = apiClient;
        this.cognitoClient = new CognitoIdentityProviderClient({
            region: config.region,
        });
    }

    /**
     * Register a new user through the API (mimics frontend registration)
     */
    async registerUser(userData?: Partial<TestUser>): Promise<TestUser> {
        const user = { ...TestDataGenerator.generateTestUser(), ...userData };

        console.log(`📝 Registering user: ${user.email}`);

        // Register through your API
        const response = await this.apiClient.post('/v1/auth/email/register', {
            email: user.email,
            password: user.password,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
        });

        if (response.status !== 200) {
            throw new Error(`Registration failed: ${JSON.stringify(response.data)}`);
        }

        this.createdUsers.push(user.email);

        // For e2e tests, we need to confirm the user automatically
        // In production, this would be done through email confirmation
        if (config.userPoolId) {
            await this.confirmUserSignUp(user.email);
        }

        return user;
    }

    /**
     * Login user and get tokens
     */
    async loginUser(email: string, password: string): Promise<TestUser> {
        console.log(`🔐 Logging in user: ${email}`);

        const response = await this.apiClient.post('/v1/auth/email/login', {
            email,
            password,
        });

        if (response.status !== 200) {
            throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
        }

        const { accessToken, refreshToken, idToken, user } = response.data;

        const testUser: TestUser = {
            email,
            password,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            accessToken,
            refreshToken,
            idToken,
            userId: user.id,
        };

        // Set the auth token in the API client
        this.apiClient.setAuthToken(accessToken);

        return testUser;
    }

    /**
     * Create and login a test user in one step
     */
    async createAndLoginTestUser(userData?: Partial<TestUser>): Promise<TestUser> {
        const user = await this.registerUser(userData);
        return await this.loginUser(user.email, user.password);
    }

    /**
     * Create a host profile for a user
     */
    async createHostProfile(hostData?: any): Promise<any> {
        const defaultHostData = TestDataGenerator.generateTestHost();
        const finalHostData = { ...defaultHostData, ...hostData };

        console.log(`🏢 Creating host profile: ${finalHostData.businessName}`);

        const response = await this.apiClient.put('/v1/host/profile', finalHostData);

        if (response.status !== 200) {
            throw new Error(`Host profile creation failed: ${JSON.stringify(response.data)}`);
        }

        return response.data;
    }

    /**
     * Confirm user signup (for automated testing)
     */
    private async confirmUserSignUp(email: string): Promise<void> {
        if (!config.userPoolId) {
            console.warn('⚠️  No user pool ID provided, skipping Cognito confirmation');
            return;
        }

        try {
            await this.cognitoClient.send(
                new AdminConfirmSignUpCommand({
                    UserPoolId: config.userPoolId,
                    Username: email,
                })
            );
            console.log(`✅ Confirmed user signup: ${email}`);
        } catch (error: any) {
            console.warn(`⚠️  Could not confirm user signup: ${error.message}`);
            // Don't throw here as the user might already be confirmed
        }
    }

    /**
     * Set user password (for automated testing)
     */
    private async setUserPassword(email: string, password: string): Promise<void> {
        if (!config.userPoolId) {
            return;
        }

        try {
            await this.cognitoClient.send(
                new AdminSetUserPasswordCommand({
                    UserPoolId: config.userPoolId,
                    Username: email,
                    Password: password,
                    Permanent: true,
                })
            );
            console.log(`✅ Set password for user: ${email}`);
        } catch (error: any) {
            console.warn(`⚠️  Could not set user password: ${error.message}`);
        }
    }

    /**
     * Delete a user from Cognito (for cleanup)
     */
    async deleteUser(email: string): Promise<void> {
        if (!config.userPoolId) {
            return;
        }

        try {
            await this.cognitoClient.send(
                new AdminDeleteUserCommand({
                    UserPoolId: config.userPoolId,
                    Username: email,
                })
            );
            console.log(`🗑️  Deleted user: ${email}`);
        } catch (error: any) {
            console.warn(`⚠️  Could not delete user ${email}: ${error.message}`);
        }
    }

    /**
     * Logout user
     */
    logout(): void {
        this.apiClient.clearAuthToken();
    }

    /**
     * Cleanup all created users
     */
    async cleanup(): Promise<void> {
        console.log(`🧹 Cleaning up ${this.createdUsers.length} test users...`);
        
        for (const email of this.createdUsers) {
            await this.deleteUser(email);
        }
        
        this.createdUsers = [];
        this.logout();
    }

    /**
     * Get created users for manual cleanup if needed
     */
    getCreatedUsers(): string[] {
        return [...this.createdUsers];
    }
}