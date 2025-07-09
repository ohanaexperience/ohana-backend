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

describe("S3Service - Image Management", () => {
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

    describe("replaceExperienceImage", () => {
        const mockRequest = {
            authorization: "Bearer token",
            experienceId: "exp-123",
            imageId: "img-456",
            imageType: "cover",
            mimeType: "image/jpeg",
        };

        const mockExperience = {
            id: "exp-123",
            hostId: "host-123",
            coverImage: { id: "old-img", url: "old-url", mimeType: "image/jpeg", key: "hosts/user-123/experiences/exp-123/images/cover/old-img.jpeg" },
        };

        const mockHost = {
            id: "host-123",
            userId: "user-123",
        };

        beforeEach(() => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            
            const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
            getSignedUrl.mockResolvedValue("https://presigned-url.com");
        });

        it("should successfully replace an experience image", async () => {
            const result = await s3Service.replaceExperienceImage(mockRequest);

            expect(mockDecodeToken).toHaveBeenCalledWith("Bearer token");
            expect(mockDatabase.experiences.getById).toHaveBeenCalledWith("exp-123");
            expect(mockDatabase.hosts.getByUserId).toHaveBeenCalledWith("user-123");
            expect(result).toEqual({
                imageId: "img-456",
                imageType: "cover",
                uploadUrl: "https://presigned-url.com",
            });
        });

        it("should throw error if experience not found", async () => {
            mockDatabase.experiences.getById.mockResolvedValue(null);

            await expect(s3Service.replaceExperienceImage(mockRequest)).rejects.toThrow(
                ERRORS.EXPERIENCE.NOT_FOUND.CODE
            );
        });

        it("should throw error if host not found", async () => {
            mockDatabase.hosts.getByUserId.mockResolvedValue(null);

            await expect(s3Service.replaceExperienceImage(mockRequest)).rejects.toThrow(
                ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE
            );
        });

        it("should throw error if user is not the host", async () => {
            mockDatabase.hosts.getByUserId.mockResolvedValue({
                id: "different-host",
                userId: "user-123",
            });

            await expect(s3Service.replaceExperienceImage(mockRequest)).rejects.toThrow(
                ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE
            );
        });

        it("should handle S3 deletion error gracefully", async () => {
            mockS3Client.send.mockRejectedValueOnce(new Error("S3 deletion failed"));

            const result = await s3Service.replaceExperienceImage(mockRequest);

            expect(result).toEqual({
                imageId: "img-456",
                imageType: "cover",
                uploadUrl: "https://presigned-url.com",
            });
        });
    });

    describe("deleteExperienceImageById", () => {
        const mockRequest = {
            authorization: "Bearer token",
            experienceId: "exp-123",
            imageId: "img-456",
        };

        const mockExperienceWithCover = {
            id: "exp-123",
            hostId: "host-123",
            coverImage: { id: "img-456", url: "cover-url", mimeType: "image/jpeg", key: "hosts/user-123/experiences/exp-123/images/cover/img-456.jpeg" },
            galleryImages: [],
            meetingLocation: { instructions: "Meet here" },
        };

        const mockExperienceWithGallery = {
            id: "exp-123",
            hostId: "host-123",
            coverImage: null,
            galleryImages: [
                { id: "img-456", url: "gallery-url", mimeType: "image/jpeg", key: "hosts/user-123/experiences/exp-123/images/gallery/img-456.jpeg" },
                { id: "img-789", url: "gallery-url-2", mimeType: "image/jpeg", key: "hosts/user-123/experiences/exp-123/images/gallery/img-789.jpeg" },
            ],
            meetingLocation: { instructions: "Meet here" },
        };

        const mockHost = {
            id: "host-123",
            userId: "user-123",
        };

        beforeEach(() => {
            mockDecodeToken.mockReturnValue({ sub: "user-123" } as any);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
        });

        it("should successfully delete a cover image", async () => {
            mockDatabase.experiences.getById.mockResolvedValue(mockExperienceWithCover);

            const result = await s3Service.deleteExperienceImageById(mockRequest);

            expect(mockDatabase.experiences.update).toHaveBeenCalledWith("exp-123", {
                coverImage: null,
            });
            expect(result.message).toContain("Image img-456 successfully deleted");
        });

        it("should successfully delete a gallery image", async () => {
            mockDatabase.experiences.getById.mockResolvedValue(mockExperienceWithGallery);

            const result = await s3Service.deleteExperienceImageById(mockRequest);

            expect(mockDatabase.experiences.update).toHaveBeenCalledWith("exp-123", {
                galleryImages: [{ id: "img-789", url: "gallery-url-2", mimeType: "image/jpeg", key: "hosts/user-123/experiences/exp-123/images/gallery/img-789.jpeg" }],
            });
            expect(result.message).toContain("Image img-456 successfully deleted");
        });

        it("should successfully delete a meeting location image", async () => {
            const mockExperienceWithMeetingImage = {
                ...mockExperienceWithCover,
                coverImage: null,
                meetingLocation: {
                    instructions: "Meet here",
                    image: { id: "img-456", url: "meeting-url", mimeType: "image/jpeg", key: "hosts/user-123/experiences/exp-123/images/meeting-location/img-456.jpeg" },
                },
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperienceWithMeetingImage);

            const result = await s3Service.deleteExperienceImageById(mockRequest);

            expect(mockDatabase.experiences.update).toHaveBeenCalledWith("exp-123", {
                meetingLocation: { instructions: "Meet here" },
            });
            expect(result.message).toContain("Image img-456 successfully deleted");
        });

        it("should throw error if image not found in experience", async () => {
            const mockExperienceWithoutImage = {
                ...mockExperienceWithCover,
                coverImage: { id: "different-img", url: "cover-url", mimeType: "image/jpeg", key: "hosts/user-123/experiences/exp-123/images/cover/different-img.jpeg" },
                galleryImages: [],
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperienceWithoutImage);

            await expect(s3Service.deleteExperienceImageById(mockRequest)).rejects.toThrow(
                "Image with ID img-456 not found in experience exp-123"
            );
        });

        it("should throw error if experience not found", async () => {
            mockDatabase.experiences.getById.mockResolvedValue(null);

            await expect(s3Service.deleteExperienceImageById(mockRequest)).rejects.toThrow(
                ERRORS.EXPERIENCE.NOT_FOUND.CODE
            );
        });

        it("should throw error if user is not the host", async () => {
            mockDatabase.experiences.getById.mockResolvedValue(mockExperienceWithCover);
            mockDatabase.hosts.getByUserId.mockResolvedValue({
                id: "different-host",
                userId: "user-123",
            });

            await expect(s3Service.deleteExperienceImageById(mockRequest)).rejects.toThrow(
                ERRORS.EXPERIENCE.FORBIDDEN_DELETE.CODE
            );
        });
    });

    describe("handleExperienceImageUpload - Gallery Image Limit", () => {
        const mockS3Event = {
            Records: [
                {
                    s3: {
                        bucket: { name: "test-bucket" },
                        object: { key: "hosts/user-123/experiences/exp-123/images/gallery/img-456" },
                    },
                },
            ],
        };

        const mockExperienceWithMaxGalleryImages = {
            id: "exp-123",
            galleryImages: Array.from({ length: EXPERIENCE_GALLERY_IMAGE_MAX_COUNT }, (_, i) => ({
                id: `img-${i}`,
                url: `url-${i}`,
                mimeType: "image/jpeg",
                key: `hosts/user-123/experiences/exp-123/images/gallery/img-${i}.jpeg`,
            })),
        };

        beforeEach(() => {
            // Mock the parseS3Event method
            jest.spyOn(s3Service as any, "parseS3Event").mockReturnValue({
                type: "experience",
                imageType: "gallery",
                experienceId: "exp-123",
                imageUrl: "https://test-bucket.s3.amazonaws.com/hosts/user-123/experiences/exp-123/images/gallery/img-456",
                key: "hosts/user-123/experiences/exp-123/images/gallery/img-456",
            });

            jest.spyOn(s3Service as any, "extractImageMetadata").mockReturnValue({
                imageId: "img-456",
                mimeType: "image/jpeg",
            });
        });

        it("should enforce gallery image limit", async () => {
            mockDatabase.experiences.getById.mockResolvedValue(mockExperienceWithMaxGalleryImages);

            await expect(s3Service.handleExperienceImageUpload(mockS3Event as any)).rejects.toThrow(
                `Maximum of ${EXPERIENCE_GALLERY_IMAGE_MAX_COUNT} gallery images allowed`
            );
        });

        it("should allow gallery image upload when under limit", async () => {
            const mockExperienceUnderLimit = {
                ...mockExperienceWithMaxGalleryImages,
                galleryImages: [{ id: "img-1", url: "url-1", mimeType: "image/jpeg", key: "hosts/user-123/experiences/exp-123/images/gallery/img-1.jpeg" }],
            };
            mockDatabase.experiences.getById.mockResolvedValue(mockExperienceUnderLimit);

            await s3Service.handleExperienceImageUpload(mockS3Event as any);

            expect(mockDatabase.experiences.update).toHaveBeenCalled();
        });
    });

});