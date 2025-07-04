import { S3Service } from "@/s3/services/s3";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";
import { EXPERIENCE_GALLERY_IMAGE_MAX_COUNT } from "@/constants/experiences";

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
    getSignedUrl: jest.fn(),
}));

jest.mock("dayjs", () => {
    const mockDayjs = () => ({
        toISOString: jest.fn().mockReturnValue("2023-01-01T00:00:00.000Z"),
    });
    mockDayjs.extend = jest.fn();
    return mockDayjs;
});

describe("S3Service - Edge Cases and Error Handling", () => {
    let s3Service: S3Service;
    let mockDatabase: any;
    let mockS3Client: any;
    let mockDecodeToken: jest.MockedFunction<typeof decodeToken>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDatabase = {
            experiences: {
                getById: jest.fn(),
                update: jest.fn(),
            },
            hosts: {
                getByUserId: jest.fn(),
            },
        };

        mockS3Client = {
            send: jest.fn(),
        };

        const { S3Client } = require("@aws-sdk/client-s3");
        S3Client.mockImplementation(() => mockS3Client);

        s3Service = new S3Service({
            database: mockDatabase,
            s3Client: mockS3Client,
            bucketName: "test-bucket",
            assetsDomain: "test-domain.com",
        });

        mockDecodeToken = decodeToken as jest.MockedFunction<typeof decodeToken>;
    });

    describe("Token Decoding Edge Cases", () => {
        it("should handle invalid token format", async () => {
            mockDecodeToken.mockImplementation(() => {
                throw new Error("Invalid token");
            });

            const request = {
                authorization: "invalid-token",
                experienceId: "exp-123",
                imageId: "img-456",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            await expect(s3Service.replaceExperienceImage(request)).rejects.toThrow("Invalid token");
        });

        it("should handle token without sub claim", async () => {
            mockDecodeToken.mockReturnValue({} as any);

            const request = {
                authorization: "Bearer token-without-sub",
                experienceId: "exp-123",
                imageId: "img-456",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            await expect(s3Service.replaceExperienceImage(request)).rejects.toThrow();
        });
    });

    describe("Database Connection Edge Cases", () => {
        it("should handle database connection failures during experience lookup", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            mockDatabase.experiences.getById.mockRejectedValue(new Error("Database connection failed"));

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "img-456",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            await expect(s3Service.replaceExperienceImage(request)).rejects.toThrow("Database connection failed");
        });

        it("should handle database connection failures during host lookup", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            mockDatabase.experiences.getById.mockResolvedValue({ id: "exp-123", hostId: "host-123" });
            mockDatabase.hosts.getByUserId.mockRejectedValue(new Error("Database connection failed"));

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "img-456",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            await expect(s3Service.replaceExperienceImage(request)).rejects.toThrow("Database connection failed");
        });

        it("should handle database update failures", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            const mockExperience = {
                id: "exp-123",
                hostId: "host-123",
                coverImage: { id: "img-456", url: "old-url", mimeType: "image/jpeg" },
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });
            mockDatabase.experiences.update.mockRejectedValue(new Error("Database update failed"));

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "img-456",
            };

            await expect(s3Service.deleteExperienceImageById(request)).rejects.toThrow("Database update failed");
        });
    });

    describe("S3 Operation Edge Cases", () => {
        it("should handle S3 presigned URL generation failures", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            mockDatabase.experiences.getById.mockResolvedValue({ id: "exp-123", hostId: "host-123" });
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });

            const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
            getSignedUrl.mockRejectedValue(new Error("S3 presigned URL generation failed"));

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "img-456",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            await expect(s3Service.replaceExperienceImage(request)).rejects.toThrow("S3 presigned URL generation failed");
        });

        it("should handle S3 deletion failures during replacement", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            mockDatabase.experiences.getById.mockResolvedValue({ id: "exp-123", hostId: "host-123" });
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });

            const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
            getSignedUrl.mockResolvedValue("https://presigned-url.com");

            mockS3Client.send.mockRejectedValue(new Error("S3 deletion failed"));

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "img-456",
                imageType: "cover",
                mimeType: "image/jpeg",
            };

            // Should not throw, as deletion failure during replacement is handled gracefully
            const result = await s3Service.replaceExperienceImage(request);
            expect(result.uploadUrl).toBe("https://presigned-url.com");
        });

        it("should handle S3 deletion failures during image deletion", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            const mockExperience = {
                id: "exp-123",
                hostId: "host-123",
                coverImage: { id: "img-456", url: "cover-url", mimeType: "image/jpeg" },
                galleryImages: [],
                meetingLocation: { instructions: "Meet here" },
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });

            mockS3Client.send.mockRejectedValue(new Error("S3 deletion failed"));

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "img-456",
            };

            await expect(s3Service.deleteExperienceImageById(request)).rejects.toThrow("S3 deletion failed");
        });
    });

    describe("Experience Data Edge Cases", () => {
        it("should handle experience with null cover image", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            const mockExperience = {
                id: "exp-123",
                hostId: "host-123",
                coverImage: null,
                galleryImages: [],
                meetingLocation: { instructions: "Meet here" },
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "non-existent-img",
            };

            await expect(s3Service.deleteExperienceImageById(request)).rejects.toThrow(
                "Image with ID non-existent-img not found in experience exp-123"
            );
        });

        it("should handle experience with empty gallery images", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            const mockExperience = {
                id: "exp-123",
                hostId: "host-123",
                coverImage: { id: "cover-img", url: "cover-url", mimeType: "image/jpeg" },
                galleryImages: [],
                meetingLocation: { instructions: "Meet here" },
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "gallery-img-1",
            };

            await expect(s3Service.deleteExperienceImageById(request)).rejects.toThrow(
                "Image with ID gallery-img-1 not found in experience exp-123"
            );
        });

        it("should handle experience with null gallery images", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            const mockExperience = {
                id: "exp-123",
                hostId: "host-123",
                coverImage: { id: "cover-img", url: "cover-url", mimeType: "image/jpeg" },
                galleryImages: null,
                meetingLocation: { instructions: "Meet here" },
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "gallery-img-1",
            };

            await expect(s3Service.deleteExperienceImageById(request)).rejects.toThrow(
                "Image with ID gallery-img-1 not found in experience exp-123"
            );
        });

        it("should handle experience with null meeting location", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            const mockExperience = {
                id: "exp-123",
                hostId: "host-123",
                coverImage: { id: "cover-img", url: "cover-url", mimeType: "image/jpeg" },
                galleryImages: [],
                meetingLocation: null,
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "meeting-img-1",
            };

            await expect(s3Service.deleteExperienceImageById(request)).rejects.toThrow(
                "Image with ID meeting-img-1 not found in experience exp-123"
            );
        });

        it("should handle experience with meeting location without image", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            const mockExperience = {
                id: "exp-123",
                hostId: "host-123",
                coverImage: { id: "cover-img", url: "cover-url", mimeType: "image/jpeg" },
                galleryImages: [],
                meetingLocation: { instructions: "Meet here" },
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.hosts.getByUserId.mockResolvedValue({ id: "host-123", userId: "user-123" });

            const request = {
                authorization: "Bearer valid-token",
                experienceId: "exp-123",
                imageId: "meeting-img-1",
            };

            await expect(s3Service.deleteExperienceImageById(request)).rejects.toThrow(
                "Image with ID meeting-img-1 not found in experience exp-123"
            );
        });
    });

    describe("Gallery Image Limit Edge Cases", () => {
        it("should handle gallery image update when exactly at limit", async () => {
            const mockExperience = {
                id: "exp-123",
                galleryImages: Array.from({ length: EXPERIENCE_GALLERY_IMAGE_MAX_COUNT }, (_, i) => ({
                    id: `img-${i}`,
                    url: `url-${i}`,
                    mimeType: "image/jpeg",
                })),
            };

            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);

            // Mock the private methods
            jest.spyOn(s3Service as any, "parseS3Event").mockReturnValue({
                type: "experience",
                imageType: "gallery",
                experienceId: "exp-123",
                imageUrl: "https://test-bucket.s3.amazonaws.com/img-0-new.jpg",
                key: "hosts/user-123/experiences/exp-123/images/gallery/img-0",
            });

            jest.spyOn(s3Service as any, "extractImageMetadata").mockReturnValue({
                imageId: "img-0", // Existing image ID
                mimeType: "image/jpeg",
            });

            const mockS3Event = {
                Records: [
                    {
                        s3: {
                            bucket: { name: "test-bucket" },
                            object: { key: "hosts/user-123/experiences/exp-123/images/gallery/img-0" },
                        },
                    },
                ],
            };

            // Should succeed because it's updating an existing image, not adding a new one
            await expect(s3Service.handleExperienceImageUpload(mockS3Event as any)).resolves.not.toThrow();
        });

        it("should handle empty gallery images array during limit check", async () => {
            const mockExperience = {
                id: "exp-123",
                galleryImages: [],
            };

            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);

            jest.spyOn(s3Service as any, "parseS3Event").mockReturnValue({
                type: "experience",
                imageType: "gallery",
                experienceId: "exp-123",
                imageUrl: "https://test-bucket.s3.amazonaws.com/new-img.jpg",
                key: "hosts/user-123/experiences/exp-123/images/gallery/new-img",
            });

            jest.spyOn(s3Service as any, "extractImageMetadata").mockReturnValue({
                imageId: "new-img",
                mimeType: "image/jpeg",
            });

            const mockS3Event = {
                Records: [
                    {
                        s3: {
                            bucket: { name: "test-bucket" },
                            object: { key: "hosts/user-123/experiences/exp-123/images/gallery/new-img" },
                        },
                    },
                ],
            };

            await expect(s3Service.handleExperienceImageUpload(mockS3Event as any)).resolves.not.toThrow();
        });
    });

    describe("Concurrent Operations Edge Cases", () => {
        it("should handle race condition during gallery image addition", async () => {
            // Simulate race condition where gallery reaches limit between check and update
            const mockExperience = {
                id: "exp-123",
                galleryImages: Array.from({ length: EXPERIENCE_GALLERY_IMAGE_MAX_COUNT - 1 }, (_, i) => ({
                    id: `img-${i}`,
                    url: `url-${i}`,
                    mimeType: "image/jpeg",
                })),
            };

            mockDatabase.experiences.getById
                .mockResolvedValueOnce(mockExperience)
                .mockResolvedValueOnce({
                    ...mockExperience,
                    galleryImages: [
                        ...mockExperience.galleryImages,
                        { id: "concurrent-img", url: "concurrent-url", mimeType: "image/jpeg" },
                    ],
                });

            jest.spyOn(s3Service as any, "parseS3Event").mockReturnValue({
                type: "experience",
                imageType: "gallery",
                experienceId: "exp-123",
                imageUrl: "https://test-bucket.s3.amazonaws.com/new-img.jpg",
                key: "hosts/user-123/experiences/exp-123/images/gallery/new-img",
            });

            jest.spyOn(s3Service as any, "extractImageMetadata").mockReturnValue({
                imageId: "new-img",
                mimeType: "image/jpeg",
            });

            const mockS3Event = {
                Records: [
                    {
                        s3: {
                            bucket: { name: "test-bucket" },
                            object: { key: "hosts/user-123/experiences/exp-123/images/gallery/new-img" },
                        },
                    },
                ],
            };

            // First call should pass the limit check but fail during update due to race condition
            await expect(s3Service.handleExperienceImageUpload(mockS3Event as any)).rejects.toThrow(
                `Maximum of ${EXPERIENCE_GALLERY_IMAGE_MAX_COUNT} gallery images allowed`
            );
        });
    });
});