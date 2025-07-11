import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { decodeToken } from "@/utils";
import { ExperienceFactory, VALID_EXPERIENCE_DATA, MINIMAL_EXPERIENCE_DATA } from "../helpers/experience-factory";

// Mock external dependencies that can't be tested e2e
jest.mock("@/utils", () => ({
    decodeToken: jest.fn(),
    generateTimeSlotsFromAvailability: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn().mockResolvedValue("https://mock-upload-url.s3.amazonaws.com/mock-key"),
}));

// Mock database connections for e2e (since we don't want to hit real DB)
let mockDatabaseInstance: any;

jest.mock("@/database", () => ({
    DatabaseFactory: {
        create: jest.fn(() => {
            mockDatabaseInstance = {
                hosts: {
                    getByUserId: jest.fn(),
                    getById: jest.fn(),
                },
                categories: {
                    getById: jest.fn(),
                },
                subCategories: {
                    getById: jest.fn(),
                },
                experiences: {
                    create: jest.fn(),
                },
                availability: {
                    create: jest.fn(),
                },
            };
            return mockDatabaseInstance;
        }),
    },
}));

// Import handler after mocks are set up
const { handler: createExperienceHandler } = require("@/experiences/lambda/host/createExperience");

describe("CreateExperience E2E Tests", () => {
    let mockDatabase: any;
    let mockContext: Context;
    const testUserId = "test-user-123";
    const testHostId = "test-host-456";

    beforeAll(() => {
        // Set up environment variables
        process.env.DB_ENDPOINT = "localhost";
        process.env.DB_PORT = "5432";
        process.env.DB_NAME = "test_db";
        process.env.DB_USER = "postgres";
        process.env.DB_PASSWORD = "password";
        process.env.ASSETS_BUCKET_NAME = "test-bucket";

        // Mock Lambda context
        mockContext = {
            callbackWaitsForEmptyEventLoop: false,
            functionName: "createExperience",
            functionVersion: "1",
            invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:createExperience",
            memoryLimitInMB: "128",
            awsRequestId: "test-request-id",
            logGroupName: "/aws/lambda/createExperience",
            logStreamName: "test-stream",
            getRemainingTimeInMillis: () => 30000,
            done: jest.fn(),
            fail: jest.fn(),
            succeed: jest.fn(),
        };

        // Mock JWT decode
        (decodeToken as jest.Mock).mockReturnValue({ sub: testUserId });
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Use the mocked database instance
        mockDatabase = mockDatabaseInstance;

        // Set up default mock responses
        mockDatabase.hosts.getByUserId.mockResolvedValue({
            id: testHostId,
            userId: testUserId,
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
            id: "new-experience-id",
            hostId: testHostId,
            title: "Test Experience",
            status: "published",
            isPublic: true,
            pricePerPerson: 75,
        });

        mockDatabase.availability.create.mockResolvedValue({
            id: "new-availability-id",
            experienceId: "new-experience-id",
        });
    });

    const createApiGatewayEvent = (body: any, headers: Record<string, string> = {}): APIGatewayProxyEvent => ({
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer mock-jwt-token",
            ...headers,
        },
        multiValueHeaders: {},
        httpMethod: "POST",
        isBase64Encoded: false,
        path: "/experiences",
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: "123456789012",
            apiId: "test-api",
            protocol: "HTTP/1.1",
            httpMethod: "POST",
            path: "/experiences",
            stage: "test",
            requestId: "test-request",
            requestTime: "2024-01-01T00:00:00.000Z",
            requestTimeEpoch: 1704067200000,
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
            resourcePath: "/experiences",
        },
        resource: "/experiences",
    });

    describe("Successful Experience Creation", () => {
        it("should create experience with valid data through complete Lambda flow", async () => {
            const experienceData = VALID_EXPERIENCE_DATA;
            const event = createApiGatewayEvent(experienceData);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(201);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.createdExperience).toBeDefined();
            expect(responseBody.uploadUrls).toBeDefined();

            // Verify the Lambda processed the request correctly
            expect(mockDatabase.hosts.getByUserId).toHaveBeenCalledWith(testUserId);
            expect(mockDatabase.categories.getById).toHaveBeenCalledWith(1);
            expect(mockDatabase.subCategories.getById).toHaveBeenCalledWith(1);
            expect(mockDatabase.experiences.create).toHaveBeenCalled();
            expect(mockDatabase.availability.create).toHaveBeenCalled();

            // Verify experience data passed through correctly
            const createCall = mockDatabase.experiences.create.mock.calls[0][0];
            expect(createCall.title).toContain("Test Adventure Experience");
            expect(createCall.hostId).toBe(testHostId);
            expect(createCall.pricePerPerson).toBe(75);
            expect(createCall.status).toBe("published");
        });

        it("should create minimal experience through complete Lambda flow", async () => {
            const experienceData = MINIMAL_EXPERIENCE_DATA;
            const event = createApiGatewayEvent(experienceData);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(201);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.createdExperience).toBeDefined();

            // Verify optional fields are not set
            const createCall = mockDatabase.experiences.create.mock.calls[0][0];
            expect(createCall.groupDiscountsEnabled).toBeUndefined();
            expect(createCall.earlyBirdEnabled).toBeUndefined();
            expect(createCall.whatToBring).toBeUndefined();
        });

        it("should handle different image types correctly", async () => {
            const experienceDataWithImages = {
                ...VALID_EXPERIENCE_DATA,
                images: [
                    { imageType: "cover", mimeType: "image/jpeg" },
                    { imageType: "gallery", mimeType: "image/png" },
                    { imageType: "meeting-location", mimeType: "image/webp" },
                ],
            };
            const event = createApiGatewayEvent(experienceDataWithImages);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(201);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.uploadUrls).toBeDefined();
            expect(Array.isArray(responseBody.uploadUrls)).toBe(true);
        });
    });

    describe("Authentication and Authorization", () => {
        it("should fail when authorization header is missing", async () => {
            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA, { Authorization: undefined });

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(500); // Middleware should handle this
        });

        it("should fail when user is not a host", async () => {
            mockDatabase.hosts.getByUserId.mockResolvedValue(null);

            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(400);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toContain("HOST_NOT_FOUND");
        });
    });

    describe("Validation Errors", () => {
        it("should fail with invalid category", async () => {
            mockDatabase.categories.getById.mockResolvedValue(null);

            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(400);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toContain("CATEGORY");
        });

        it("should fail with mismatched subcategory", async () => {
            mockDatabase.subCategories.getById.mockResolvedValue({
                id: 1,
                categoryId: 2, // Different from main category
                name: "Mismatched Subcategory",
            });

            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(400);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toContain("CATEGORY_MISMATCH");
        });

        it("should fail with invalid request body schema", async () => {
            const invalidData = {
                title: "", // Empty title
                // Missing required fields
            };
            const event = createApiGatewayEvent(invalidData);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it("should fail with missing required fields", async () => {
            const incompleteData = {
                title: "Test Experience",
                // Missing other required fields
            };
            const event = createApiGatewayEvent(incompleteData);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe("Middleware Integration", () => {
        it("should handle CORS headers correctly", async () => {
            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            // CORS middleware should add these headers
            expect(result.headers).toBeDefined();
            expect(result.headers?.["Access-Control-Allow-Origin"]).toBeDefined();
        });

        it("should parse JSON body correctly through middleware", async () => {
            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(201);
            
            // Verify that the JSON was parsed and processed
            expect(mockDatabase.experiences.create).toHaveBeenCalled();
            const createCall = mockDatabase.experiences.create.mock.calls[0][0];
            expect(createCall.title).toContain("Test Adventure Experience");
        });

        it("should validate request body schema through Zod middleware", async () => {
            const invalidData = {
                title: "Valid Title",
                tagline: "Valid Tagline",
                pricePerPerson: "invalid-price", // Should be number
                // ... other fields
            };
            const event = createApiGatewayEvent(invalidData);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe("Error Handling", () => {
        it("should handle database connection errors gracefully", async () => {
            mockDatabase.hosts.getByUserId.mockRejectedValue(new Error("Database connection failed"));

            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(500);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe("Internal server error");
        });

        it("should handle S3 service errors gracefully", async () => {
            // Mock S3 client to throw error
            const { S3Client } = require("@aws-sdk/client-s3");
            S3Client.mockImplementation(() => {
                throw new Error("S3 service unavailable");
            });

            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(500);
        });
    });

    describe("Response Format", () => {
        it("should return properly formatted success response", async () => {
            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(201);
            expect(result.headers).toBeDefined();
            expect(typeof result.body).toBe("string");
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.createdExperience).toBeDefined();
            expect(responseBody.uploadUrls).toBeDefined();
            expect(Array.isArray(responseBody.uploadUrls)).toBe(true);
        });

        it("should return properly formatted error response", async () => {
            mockDatabase.hosts.getByUserId.mockResolvedValue(null);

            const event = createApiGatewayEvent(VALID_EXPERIENCE_DATA);

            const result = await createExperienceHandler(event, mockContext);

            expect(result.statusCode).toBe(400);
            expect(result.headers).toBeDefined();
            expect(typeof result.body).toBe("string");
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBeDefined();
            expect(responseBody.message).toBeDefined();
        });
    });
});