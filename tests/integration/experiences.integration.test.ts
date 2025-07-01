import { ExperienceController } from "@/experiences/controllers/experience";
import { ExperienceService } from "@/experiences/services/experience";
import { decodeToken } from "@/utils";
import { DatabaseTestHelper } from "../helpers/database.helper";
import { ExperienceFactory, VALID_EXPERIENCE_DATA, MINIMAL_EXPERIENCE_DATA, INVALID_CATEGORY_EXPERIENCE_DATA } from "../helpers/experience-factory";

// Mock external dependencies
jest.mock("@/utils", () => ({
    decodeToken: jest.fn(),
    generateTimeSlotsFromAvailability: jest.fn(),
}));

jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");

describe("Experience Integration Tests", () => {
    let experienceController: ExperienceController;
    let dbHelper: DatabaseTestHelper;
    let testUser: any;
    let testHost: any;

    beforeAll(async () => {
        // Setup test database
        dbHelper = new DatabaseTestHelper();
        await dbHelper.setupDatabase();

        // Create test user and host
        const { user, host } = await dbHelper.createTestUserAndHost();
        testUser = user;
        testHost = host;

        // Mock S3 service
        const mockS3Service = {
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
        };

        const experienceService = new ExperienceService({
            database: dbHelper.getDatabase(),
            s3Service: mockS3Service as any,
        });

        experienceController = new ExperienceController({
            experienceService,
        });

        // Mock JWT decode
        (decodeToken as jest.Mock).mockReturnValue({ sub: testUser.id });
    });

    afterAll(async () => {
        await dbHelper.teardownDatabase();
    });

    describe("hostCreateExperience", () => {
        it("should successfully create an experience with all required fields", async () => {
            const createExperienceRequest = ExperienceFactory.createRequestWithAuth(
                VALID_EXPERIENCE_DATA
            );

            const result = await experienceController.hostCreateExperience(
                createExperienceRequest
            );

            expect(result.statusCode).toBe(201);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.createdExperience).toBeDefined();
            expect(responseBody.uploadUrls).toBeDefined();
            expect(responseBody.uploadUrls).toHaveLength(2);

            // Verify experience was created in database
            const createdExperience = responseBody.createdExperience;
            expect(createdExperience.title).toContain("Test Adventure Experience");
            expect(createdExperience.hostId).toBe(testHost.id);
            expect(createdExperience.pricePerPerson).toBe(75);
            expect(createdExperience.status).toBe("published");
            expect(createdExperience.isPublic).toBe(true);

            // Verify upload URLs were generated
            expect(responseBody.uploadUrls[0].uploadUrl).toContain("test-bucket.s3.amazonaws.com");
            expect(responseBody.uploadUrls[1].uploadUrl).toContain("test-bucket.s3.amazonaws.com");
        });

        it("should fail when creating experience with invalid category", async () => {
            const createExperienceRequest = ExperienceFactory.createRequestWithAuth(
                INVALID_CATEGORY_EXPERIENCE_DATA
            );

            const result = await experienceController.hostCreateExperience(
                createExperienceRequest
            );

            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toContain("CATEGORY");
        });

        it("should fail when user is not a host", async () => {
            // Mock a different user ID that doesn't have a host record
            (decodeToken as jest.Mock).mockReturnValueOnce({ sub: "non-host-user" });

            const createExperienceRequest = {
                authorization: "Bearer mock-token",
                title: "Non-host Experience",
                tagline: "This should fail",
                category: {
                    mainId: 1,
                    subId: 1,
                },
                languages: ["en"],
                experienceType: "adventure" as const,
                description: "This should fail because user is not a host",
                startingLocation: {
                    address: "123 Start Street",
                    latitude: 40.7128,
                    longitude: -74.0060,
                },
                endingLocation: {
                    address: "456 End Avenue",
                    latitude: 40.7589,
                    longitude: -73.9851,
                },
                meetingLocation: {
                    instructions: "Meet at the entrance",
                },
                pricePerPerson: 50,
                cancellationPolicy: "flexible" as const,
                groupSize: {
                    minGuests: 1,
                    maxGuests: 4,
                    autoCancelEnabled: false,
                },
                includedItems: ["equipment"],
                physicalRequirements: "easy" as const,
                ageRecommendations: "all-ages" as const,
                durationHours: 2,
                timezone: "America/New_York",
                availability: {
                    startDate: "2024-02-01",
                    timeSlots: ["10:00"],
                },
                images: [],
            };

            const result = await experienceController.hostCreateExperience(
                createExperienceRequest
            );

            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toContain("HOST_NOT_FOUND");
        });

        it("should create experience without optional fields", async () => {
            (decodeToken as jest.Mock).mockReturnValue({ sub: testUser.id });

            const minimalCreateRequest = ExperienceFactory.createRequestWithAuth(
                MINIMAL_EXPERIENCE_DATA
            );

            const result = await experienceController.hostCreateExperience(
                minimalCreateRequest
            );

            expect(result.statusCode).toBe(201);
            
            const responseBody = JSON.parse(result.body);
            expect(responseBody.createdExperience).toBeDefined();
            expect(responseBody.createdExperience.title).toContain("Minimal Test Experience");
            expect(responseBody.createdExperience.groupDiscountsEnabled).toBe(false);
            expect(responseBody.createdExperience.earlyBirdEnabled).toBe(false);
        });
    });
});