import { S3Controller } from "@/s3/controllers/s3";
import ERRORS from "@/errors";

describe("S3Controller - Image Management", () => {
    let s3Controller: S3Controller;
    let mockS3Service: any;

    beforeEach(() => {
        mockS3Service = {
            replaceExperienceImage: jest.fn(),
            deleteExperienceImageById: jest.fn(),
        };

        s3Controller = new S3Controller({
            database: {} as any,
            s3Client: {} as any,
            bucketName: "test-bucket",
            assetsDomain: "test-domain.com",
        });

        // Replace the service with our mock
        (s3Controller as any).s3Service = mockS3Service;
    });

    describe("replaceExperienceImage", () => {
        const mockRequest = {
            authorization: "Bearer token",
            experienceId: "exp-123",
            imageId: "img-456",
            imageType: "cover",
            mimeType: "image/jpeg",
        };

        it("should return 200 with upload URL on success", async () => {
            const mockResult = {
                imageId: "img-456",
                imageType: "cover",
                uploadUrl: "https://presigned-url.com",
            };
            mockS3Service.replaceExperienceImage.mockResolvedValue(mockResult);

            const result = await s3Controller.replaceExperienceImage(mockRequest);

            expect(result).toEqual({
                statusCode: 200,
                body: JSON.stringify(mockResult),
            });
            expect(mockS3Service.replaceExperienceImage).toHaveBeenCalledWith(mockRequest);
        });

        it("should return 400 for experience not found error", async () => {
            const error = new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
            mockS3Service.replaceExperienceImage.mockRejectedValue(error);

            const result = await s3Controller.replaceExperienceImage(mockRequest);

            expect(result).toEqual({
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.EXPERIENCE.NOT_FOUND.CODE,
                    message: ERRORS.EXPERIENCE.NOT_FOUND.MESSAGE,
                }),
            });
        });

        it("should return 500 for unexpected errors", async () => {
            const error = new Error("Unexpected error");
            mockS3Service.replaceExperienceImage.mockRejectedValue(error);

            const result = await s3Controller.replaceExperienceImage(mockRequest);

            expect(result).toEqual({
                statusCode: 500,
                body: JSON.stringify({
                    error: "Internal server error",
                    message: "An unexpected error occurred",
                }),
            });
        });
    });

    describe("deleteExperienceImageById", () => {
        const mockRequest = {
            authorization: "Bearer token",
            experienceId: "exp-123",
            imageId: "img-456",
        };

        it("should return 200 with success message", async () => {
            const mockResult = {
                message: "Image img-456 successfully deleted from experience exp-123",
            };
            mockS3Service.deleteExperienceImageById.mockResolvedValue(mockResult);

            const result = await s3Controller.deleteExperienceImageById(mockRequest);

            expect(result).toEqual({
                statusCode: 200,
                body: JSON.stringify(mockResult),
            });
            expect(mockS3Service.deleteExperienceImageById).toHaveBeenCalledWith(mockRequest);
        });

        it("should return 400 for experience not found error", async () => {
            const error = new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
            mockS3Service.deleteExperienceImageById.mockRejectedValue(error);

            const result = await s3Controller.deleteExperienceImageById(mockRequest);

            expect(result).toEqual({
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.EXPERIENCE.NOT_FOUND.CODE,
                    message: ERRORS.EXPERIENCE.NOT_FOUND.MESSAGE,
                }),
            });
        });

        it("should return 400 for invalid image type error", async () => {
            const error = new Error(ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE);
            mockS3Service.deleteExperienceImageById.mockRejectedValue(error);

            const result = await s3Controller.deleteExperienceImageById(mockRequest);

            expect(result).toEqual({
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE,
                    message: ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.MESSAGE,
                }),
            });
        });

        it("should return 500 for unexpected errors", async () => {
            const error = new Error("Unexpected error");
            mockS3Service.deleteExperienceImageById.mockRejectedValue(error);

            const result = await s3Controller.deleteExperienceImageById(mockRequest);

            expect(result).toEqual({
                statusCode: 500,
                body: JSON.stringify({
                    error: "Internal server error",
                    message: "An unexpected error occurred",
                }),
            });
        });
    });
});