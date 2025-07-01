import { APIGatewayProxyEvent, Context } from "aws-lambda";

/**
 * Helper utility for creating mock API Gateway events for Lambda testing
 */
export class LambdaTestHelper {
    /**
     * Creates a mock API Gateway event for testing Lambda handlers
     */
    static createApiGatewayEvent(
        options: {
            httpMethod?: string;
            path?: string;
            body?: any;
            headers?: Record<string, string>;
            pathParameters?: Record<string, string> | null;
            queryStringParameters?: Record<string, string> | null;
        } = {}
    ): APIGatewayProxyEvent {
        const {
            httpMethod = "POST",
            path = "/test",
            body = {},
            headers = {},
            pathParameters = null,
            queryStringParameters = null,
        } = options;

        return {
            body: typeof body === "string" ? body : JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            multiValueHeaders: {},
            httpMethod,
            isBase64Encoded: false,
            path,
            pathParameters,
            queryStringParameters,
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {
                accountId: "123456789012",
                apiId: "test-api",
                protocol: "HTTP/1.1",
                httpMethod,
                path,
                stage: "test",
                requestId: `test-request-${Date.now()}`,
                requestTime: new Date().toISOString(),
                requestTimeEpoch: Date.now(),
                identity: {
                    cognitoIdentityPoolId: null,
                    accountId: null,
                    cognitoIdentityId: null,
                    caller: null,
                    sourceIp: "127.0.0.1",
                    principalOrgId: null,
                    accessKey: null,
                    cognitoAuthenticationType: null,
                    cognitoAuthenticationProvider: null,
                    userArn: null,
                    userAgent: "test-agent",
                    user: null,
                    apiKey: null,
                    apiKeyId: null,
                    clientCert: null,
                    cognitoUserPoolId: null,
                },
                authorizer: null,
                resourceId: "test-resource",
                resourcePath: path,
            },
            resource: path,
        };
    }

    /**
     * Creates a mock Lambda context for testing
     */
    static createLambdaContext(
        options: {
            functionName?: string;
            memoryLimitInMB?: string;
            remainingTimeInMillis?: number;
        } = {}
    ): Context {
        const {
            functionName = "test-function",
            memoryLimitInMB = "128",
            remainingTimeInMillis = 30000,
        } = options;

        return {
            callbackWaitsForEmptyEventLoop: false,
            functionName,
            functionVersion: "1",
            invokedFunctionArn: `arn:aws:lambda:us-east-1:123456789012:function:${functionName}`,
            memoryLimitInMB,
            awsRequestId: `test-request-${Date.now()}`,
            logGroupName: `/aws/lambda/${functionName}`,
            logStreamName: `test-stream-${Date.now()}`,
            getRemainingTimeInMillis: () => remainingTimeInMillis,
            done: jest.fn(),
            fail: jest.fn(),
            succeed: jest.fn(),
        };
    }

    /**
     * Creates a mock event for createExperience endpoint
     */
    static createCreateExperienceEvent(
        experienceData: any,
        options: {
            authorization?: string;
            headers?: Record<string, string>;
        } = {}
    ): APIGatewayProxyEvent {
        const { authorization = "Bearer mock-jwt-token", headers = {} } = options;

        return this.createApiGatewayEvent({
            httpMethod: "POST",
            path: "/experiences",
            body: experienceData,
            headers: {
                Authorization: authorization,
                ...headers,
            },
        });
    }

    /**
     * Sets up common environment variables for testing
     */
    static setupTestEnvironment(overrides: Record<string, string> = {}): void {
        const defaultEnv = {
            DB_ENDPOINT: "localhost",
            DB_PORT: "5432",
            DB_NAME: "test_db",
            DB_USER: "postgres",
            DB_PASSWORD: "password",
            ASSETS_BUCKET_NAME: "test-bucket",
            ...overrides,
        };

        Object.entries(defaultEnv).forEach(([key, value]) => {
            process.env[key] = value;
        });
    }

    /**
     * Creates a mock database instance with all required methods
     */
    static createMockDatabase(): any {
        return {
            hosts: {
                getByUserId: jest.fn(),
                getById: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            users: {
                getById: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            categories: {
                getById: jest.fn(),
                getAll: jest.fn(),
            },
            subCategories: {
                getById: jest.fn(),
                getAll: jest.fn(),
            },
            experiences: {
                getAll: jest.fn(),
                getById: jest.fn(),
                getAllByHostId: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                searchExperiences: jest.fn(),
            },
            availability: {
                getAll: jest.fn(),
                getById: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            timeSlots: {
                getAll: jest.fn(),
                getById: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
        };
    }

    /**
     * Creates a mock S3 service instance
     */
    static createMockS3Service(): any {
        return {
            getExperienceImageUploadUrls: jest.fn().mockResolvedValue([
                {
                    id: "test-image-1",
                    imageType: "cover",
                    mimeType: "image/jpeg",
                    uploadUrl: "https://test-bucket.s3.amazonaws.com/upload-url-1",
                },
                {
                    id: "test-image-2", 
                    imageType: "gallery",
                    mimeType: "image/jpeg",
                    uploadUrl: "https://test-bucket.s3.amazonaws.com/upload-url-2",
                },
            ]),
            deleteExperienceImages: jest.fn().mockResolvedValue(undefined),
            getProfileImageUploadUrl: jest.fn().mockResolvedValue({
                uploadUrl: "https://test-bucket.s3.amazonaws.com/profile-upload-url",
            }),
            handleProfileImageUpload: jest.fn().mockResolvedValue(undefined),
            handleExperienceImageUpload: jest.fn().mockResolvedValue(undefined),
        };
    }

    /**
     * Sets up default mock responses for successful experience creation
     */
    static setupSuccessfulMocks(mockDatabase: any, options: {
        userId?: string;
        hostId?: string;
        experienceId?: string;
    } = {}): void {
        const {
            userId = "test-user-123",
            hostId = "test-host-456", 
            experienceId = "new-experience-id",
        } = options;

        mockDatabase.hosts.getByUserId.mockResolvedValue({
            id: hostId,
            userId,
            businessName: "Test Business",
            status: "active",
        });

        mockDatabase.categories.getById.mockResolvedValue({
            id: 1,
            name: "Adventure",
        });

        mockDatabase.subCategories.getById.mockResolvedValue({
            id: 1,
            categoryId: 1,
            name: "Outdoor Adventure",
        });

        mockDatabase.experiences.create.mockResolvedValue({
            id: experienceId,
            hostId,
            title: "Test Experience",
            status: "published",
            isPublic: true,
            pricePerPerson: 75,
        });

        mockDatabase.availability.create.mockResolvedValue({
            id: "new-availability-id",
            experienceId,
        });
    }

    /**
     * Validates the structure of a Lambda response
     */
    static validateLambdaResponse(response: any): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (typeof response !== "object" || response === null) {
            errors.push("Response must be an object");
            return { isValid: false, errors };
        }

        if (typeof response.statusCode !== "number") {
            errors.push("Response must have a numeric statusCode");
        }

        if (typeof response.body !== "string") {
            errors.push("Response body must be a string");
        }

        if (response.headers && typeof response.headers !== "object") {
            errors.push("Response headers must be an object if present");
        }

        // Try to parse body as JSON
        if (typeof response.body === "string") {
            try {
                JSON.parse(response.body);
            } catch (e) {
                errors.push("Response body must be valid JSON");
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}