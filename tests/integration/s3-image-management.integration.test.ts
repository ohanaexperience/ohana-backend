import { S3Controller } from "@/s3/controllers/s3";
import { S3Service } from "@/s3/services/s3";
import { decodeToken } from "@/utils";
import { DatabaseTestHelper } from "../helpers/database.helper";
import { ExperienceFactory } from "../helpers/experience-factory";
import ERRORS from "@/errors";

// Mock external dependencies
jest.mock("@/utils", () => ({
    decodeToken: jest.fn(),
}));

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
    })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn().mockResolvedValue("https://test-bucket.s3.amazonaws.com/presigned-url"),
}));

describe("S3 Image Management Integration Tests", () => {
    let s3Controller: S3Controller;
    let dbHelper: DatabaseTestHelper;
    let testUser: any;
    let testHost: any;
    let testExperience: any;
    let mockDecodeToken: jest.MockedFunction<typeof decodeToken>;

    beforeAll(async () => {
        // Setup test database
        dbHelper = new DatabaseTestHelper();
        await dbHelper.setupDatabase();

        // Create test user and host
        const { user, host } = await dbHelper.createTestUserAndHost();
        testUser = user;
        testHost = host;

        // Create test experience with images
        testExperience = await dbHelper.createTestExperience({
            hostId: testHost.id,
            coverImage: {
                id: "cover-img-123",
                url: "https://test-bucket.s3.amazonaws.com/cover.jpg",
                mimeType: "image/jpeg",
            },
            galleryImages: [
                {
                    id: "gallery-img-1",
                    url: "https://test-bucket.s3.amazonaws.com/gallery1.jpg",
                    mimeType: "image/jpeg",
                },
                {
                    id: "gallery-img-2",
                    url: "https://test-bucket.s3.amazonaws.com/gallery2.jpg",
                    mimeType: "image/jpeg",
                },
            ],
            meetingLocation: {
                instructions: "Meet at the entrance",
                image: {
                    id: "meeting-img-123",
                    url: "https://test-bucket.s3.amazonaws.com/meeting.jpg",
                    mimeType: "image/jpeg",
                },
            },
        });

        // Initialize S3 controller with test database
        const mockS3Client = {
            send: jest.fn(),
        };
        
        s3Controller = new S3Controller({
            database: dbHelper.db,
            s3Client: mockS3Client as any,
            bucketName: "test-bucket",
            assetsDomain: "test-domain.com",
        });

        mockDecodeToken = decodeToken as jest.MockedFunction<typeof decodeToken>;
        mockDecodeToken.mockReturnValue({ sub: testUser.id } as any);
    });

    afterAll(async () => {
        await dbHelper.cleanup();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockDecodeToken.mockReturnValue({ sub: testUser.id } as any);
    });

    describe("replaceExperienceImage", () => {
        it("should successfully replace a cover image", async () => {
            const request = {
                authorization: "Bearer valid-token",
                experienceId: testExperience.id,
                imageId: "new-cover-img",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            const result = await s3Controller.replaceExperienceImage(request);

            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody).toEqual({
                imageId: "new-cover-img",
                imageType: "cover",
                uploadUrl: "https://test-bucket.s3.amazonaws.com/presigned-url",
            });
        });

        it("should successfully replace a gallery image", async () => {
            const request = {
                authorization: "Bearer valid-token",
                experienceId: testExperience.id,
                imageId: "new-gallery-img",
                imageType: "gallery",
                mimeType: "image/png",
            };

            const result = await s3Controller.replaceExperienceImage(request);

            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.imageType).toBe("gallery");
            expect(responseBody.uploadUrl).toBe("https://test-bucket.s3.amazonaws.com/presigned-url");
        });

        it("should fail when user is not the host", async () => {
            // Create another user
            const anotherUser = await dbHelper.createTestUser("another@test.com");
            mockDecodeToken.mockReturnValue({ sub: anotherUser.id } as any);

            const request = {
                authorization: "Bearer valid-token",
                experienceId: testExperience.id,
                imageId: "new-cover-img",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            const result = await s3Controller.replaceExperienceImage(request);

            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe(ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE);
        });

        it("should fail when experience does not exist", async () => {
            const request = {
                authorization: "Bearer valid-token",
                experienceId: "non-existent-exp",
                imageId: "new-cover-img",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            const result = await s3Controller.replaceExperienceImage(request);

            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        });
    });

    describe("deleteExperienceImageById", () => {
        it("should successfully delete a cover image", async () => {
            const request = {
                authorization: "Bearer valid-token",
                experienceId: testExperience.id,
                imageId: "cover-img-123",
            };

            const result = await s3Controller.deleteExperienceImageById(request);

            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.message).toContain("successfully deleted");

            // Verify image was removed from database
            const updatedExperience = await dbHelper.db.experiences.getById(testExperience.id);
            expect(updatedExperience.coverImage).toBeNull();
        });

        it("should successfully delete a gallery image", async () => {
            const request = {
                authorization: "Bearer valid-token",
                experienceId: testExperience.id,
                imageId: "gallery-img-1",
            };

            const result = await s3Controller.deleteExperienceImageById(request);

            expect(result.statusCode).toBe(200);
            
            // Verify gallery image was removed from database
            const updatedExperience = await dbHelper.db.experiences.getById(testExperience.id);
            expect(updatedExperience.galleryImages).toHaveLength(1);
            expect(updatedExperience.galleryImages[0].id).toBe("gallery-img-2");
        });

        it("should successfully delete a meeting location image", async () => {
            const request = {
                authorization: "Bearer valid-token",
                experienceId: testExperience.id,
                imageId: "meeting-img-123",
            };

            const result = await s3Controller.deleteExperienceImageById(request);

            expect(result.statusCode).toBe(200);
            
            // Verify meeting location image was removed from database
            const updatedExperience = await dbHelper.db.experiences.getById(testExperience.id);
            expect(updatedExperience.meetingLocation.image).toBeUndefined();
            expect(updatedExperience.meetingLocation.instructions).toBe("Meet at the entrance");
        });

        it("should fail when image does not exist in experience", async () => {
            const request = {
                authorization: "Bearer valid-token",
                experienceId: testExperience.id,
                imageId: "non-existent-img",
            };

            const result = await s3Controller.deleteExperienceImageById(request);

            expect(result.statusCode).toBe(500);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe("Internal server error");
        });

        it("should fail when user is not the host", async () => {
            // Create another user
            const anotherUser = await dbHelper.createTestUser("another2@test.com");
            mockDecodeToken.mockReturnValue({ sub: anotherUser.id } as any);

            const request = {
                authorization: "Bearer valid-token",
                experienceId: testExperience.id,
                imageId: "cover-img-123",
            };

            const result = await s3Controller.deleteExperienceImageById(request);

            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe(ERRORS.EXPERIENCE.FORBIDDEN_DELETE.CODE);
        });

        it("should fail when experience does not exist", async () => {
            const request = {
                authorization: "Bearer valid-token",
                experienceId: "non-existent-exp",
                imageId: "some-img",
            };

            const result = await s3Controller.deleteExperienceImageById(request);

            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        });
    });

    describe("Gallery Image Limit Integration", () => {
        it("should enforce gallery image limit during upload", async () => {
            // This test would need to be expanded based on your specific S3 upload trigger logic
            // For now, we can test the service method directly
            const mockS3Client = { send: jest.fn() };
            const s3Service = new S3Service({
                database: dbHelper.db,
                s3Client: mockS3Client as any,
                bucketName: "test-bucket",
                assetsDomain: "test-domain.com",
            });

            // Create experience with maximum gallery images
            const maxGalleryExperience = await dbHelper.createTestExperience({
                hostId: testHost.id,
                galleryImages: Array.from({ length: 10 }, (_, i) => ({
                    id: `gallery-img-${i}`,
                    url: `https://test-bucket.s3.amazonaws.com/gallery${i}.jpg`,
                    mimeType: "image/jpeg",
                })),
            });

            // Mock S3 event for gallery image upload
            const mockS3Event = {
                Records: [
                    {
                        s3: {
                            bucket: { name: "test-bucket" },
                            object: { 
                                key: `hosts/${testUser.id}/experiences/${maxGalleryExperience.id}/images/gallery/new-img.jpg`
                            },
                        },
                    },
                ],
            };

            // Mock the private methods
            jest.spyOn(s3Service as any, "parseS3Event").mockReturnValue({
                type: "experience",
                imageType: "gallery",
                experienceId: maxGalleryExperience.id,
                imageUrl: "https://test-bucket.s3.amazonaws.com/new-img.jpg",
                key: `hosts/${testUser.id}/experiences/${maxGalleryExperience.id}/images/gallery/new-img.jpg`,
            });

            jest.spyOn(s3Service as any, "extractImageMetadata").mockReturnValue({
                imageId: "new-img",
                mimeType: "image/jpeg",
            });

            await expect(s3Service.handleExperienceImageUpload(mockS3Event as any))
                .rejects.toThrow("Maximum of 10 gallery images allowed");
        });
    });
});