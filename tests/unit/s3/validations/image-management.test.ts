import { 
    ReplaceExperienceImageRequestSchema,
    ReplaceExperienceImageSchema
} from "@/s3/validations/experiences/replaceExperienceImage";
import { 
    DeleteExperienceImageByIdRequestSchema 
} from "@/s3/validations/experiences/deleteExperienceImageById";
import ERRORS from "@/errors";

describe("Image Management Validation Schemas", () => {
    describe("ReplaceExperienceImageSchema", () => {
        const validData = {
            imageType: "cover",
            mimeType: "image/jpeg",
        };

        it("should validate correct image replacement data", () => {
            const result = ReplaceExperienceImageSchema.parse(validData);
            expect(result).toEqual(validData);
        });

        it("should validate all image types", () => {
            const imageTypes = ["cover", "gallery", "meeting-location"];
            
            imageTypes.forEach(imageType => {
                const data = { ...validData, imageType };
                const result = ReplaceExperienceImageSchema.parse(data);
                expect(result.imageType).toBe(imageType);
            });
        });

        it("should validate different MIME types", () => {
            const mimeTypes = ["image/jpeg", "image/png", "image/webp"];
            
            mimeTypes.forEach(mimeType => {
                const data = { ...validData, mimeType };
                const result = ReplaceExperienceImageSchema.parse(data);
                expect(result.mimeType).toBe(mimeType);
            });
        });

        describe("imageType validation", () => {
            it("should reject invalid image types", () => {
                const invalidData = { ...validData, imageType: "invalid" };
                
                expect(() => ReplaceExperienceImageSchema.parse(invalidData))
                    .toThrow();
            });

            it("should reject missing image type", () => {
                const { imageType, ...dataWithoutImageType } = validData;
                
                expect(() => ReplaceExperienceImageSchema.parse(dataWithoutImageType))
                    .toThrow();
            });

            it("should reject null image type", () => {
                const invalidData = { ...validData, imageType: null };
                
                expect(() => ReplaceExperienceImageSchema.parse(invalidData))
                    .toThrow();
            });

            it("should reject undefined image type", () => {
                const invalidData = { ...validData, imageType: undefined };
                
                expect(() => ReplaceExperienceImageSchema.parse(invalidData))
                    .toThrow();
            });
        });

        describe("mimeType validation", () => {
            it("should reject non-image MIME types", () => {
                const invalidMimeTypes = [
                    "text/plain",
                    "application/pdf",
                    "video/mp4",
                    "audio/mp3",
                ];
                
                invalidMimeTypes.forEach(mimeType => {
                    const invalidData = { ...validData, mimeType };
                    expect(() => ReplaceExperienceImageSchema.parse(invalidData))
                        .toThrow();
                });
            });

            it("should reject invalid MIME type format", () => {
                const invalidMimeTypes = [
                    "image",
                    "jpeg",
                    "image/",
                    "/jpeg",
                    "invalid-mime-type",
                ];
                
                invalidMimeTypes.forEach(mimeType => {
                    const invalidData = { ...validData, mimeType };
                    expect(() => ReplaceExperienceImageSchema.parse(invalidData))
                        .toThrow();
                });
            });

            it("should reject missing MIME type", () => {
                const { mimeType, ...dataWithoutMimeType } = validData;
                
                expect(() => ReplaceExperienceImageSchema.parse(dataWithoutMimeType))
                    .toThrow();
            });

            it("should reject null MIME type", () => {
                const invalidData = { ...validData, mimeType: null };
                
                expect(() => ReplaceExperienceImageSchema.parse(invalidData))
                    .toThrow();
            });
        });
    });

    describe("ReplaceExperienceImageRequestSchema", () => {
        const validRequestData = {
            authorization: "Bearer valid-token",
            experienceId: "exp-123",
            imageId: "img-456",
            imageType: "cover",
            mimeType: "image/jpeg",
        };

        it("should validate complete request data", () => {
            const result = ReplaceExperienceImageRequestSchema.parse(validRequestData);
            expect(result).toEqual(validRequestData);
        });

        describe("authorization validation", () => {
            it("should reject missing authorization", () => {
                const { authorization, ...dataWithoutAuth } = validRequestData;
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(dataWithoutAuth))
                    .toThrow();
            });

            it("should reject null authorization", () => {
                const invalidData = { ...validRequestData, authorization: null };
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(invalidData))
                    .toThrow();
            });

            it("should reject non-string authorization", () => {
                const invalidData = { ...validRequestData, authorization: 123 };
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(invalidData))
                    .toThrow();
            });
        });

        describe("experienceId validation", () => {
            it("should reject missing experience ID", () => {
                const { experienceId, ...dataWithoutExpId } = validRequestData;
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(dataWithoutExpId))
                    .toThrow();
            });

            it("should reject null experience ID", () => {
                const invalidData = { ...validRequestData, experienceId: null };
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(invalidData))
                    .toThrow();
            });

            it("should reject non-string experience ID", () => {
                const invalidData = { ...validRequestData, experienceId: 123 };
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(invalidData))
                    .toThrow();
            });
        });

        describe("imageId validation", () => {
            it("should reject missing image ID", () => {
                const { imageId, ...dataWithoutImgId } = validRequestData;
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(dataWithoutImgId))
                    .toThrow();
            });

            it("should reject null image ID", () => {
                const invalidData = { ...validRequestData, imageId: null };
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(invalidData))
                    .toThrow();
            });

            it("should reject non-string image ID", () => {
                const invalidData = { ...validRequestData, imageId: 123 };
                
                expect(() => ReplaceExperienceImageRequestSchema.parse(invalidData))
                    .toThrow();
            });
        });
    });

    describe("DeleteExperienceImageByIdRequestSchema", () => {
        const validDeleteRequestData = {
            authorization: "Bearer valid-token",
            experienceId: "exp-123",
            imageId: "img-456",
        };

        it("should validate complete delete request data", () => {
            const result = DeleteExperienceImageByIdRequestSchema.parse(validDeleteRequestData);
            expect(result).toEqual(validDeleteRequestData);
        });

        it("should reject missing authorization", () => {
            const { authorization, ...dataWithoutAuth } = validDeleteRequestData;
            
            expect(() => DeleteExperienceImageByIdRequestSchema.parse(dataWithoutAuth))
                .toThrow();
        });

        it("should reject missing experience ID", () => {
            const { experienceId, ...dataWithoutExpId } = validDeleteRequestData;
            
            expect(() => DeleteExperienceImageByIdRequestSchema.parse(dataWithoutExpId))
                .toThrow();
        });

        it("should reject missing image ID", () => {
            const { imageId, ...dataWithoutImgId } = validDeleteRequestData;
            
            expect(() => DeleteExperienceImageByIdRequestSchema.parse(dataWithoutImgId))
                .toThrow();
        });

        it("should reject null values", () => {
            const fieldsToTest = ["authorization", "experienceId", "imageId"];
            
            fieldsToTest.forEach(field => {
                const invalidData = { ...validDeleteRequestData, [field]: null };
                expect(() => DeleteExperienceImageByIdRequestSchema.parse(invalidData))
                    .toThrow();
            });
        });

        it("should reject non-string values", () => {
            const fieldsToTest = ["authorization", "experienceId", "imageId"];
            
            fieldsToTest.forEach(field => {
                const invalidData = { ...validDeleteRequestData, [field]: 123 };
                expect(() => DeleteExperienceImageByIdRequestSchema.parse(invalidData))
                    .toThrow();
            });
        });

        it("should reject empty strings", () => {
            const fieldsToTest = ["authorization", "experienceId", "imageId"];
            
            fieldsToTest.forEach(field => {
                const invalidData = { ...validDeleteRequestData, [field]: "" };
                expect(() => DeleteExperienceImageByIdRequestSchema.parse(invalidData))
                    .toThrow();
            });
        });
    });

    describe("Error message validation", () => {
        it("should return proper error codes for authorization errors", () => {
            try {
                ReplaceExperienceImageRequestSchema.parse({
                    experienceId: "exp-123",
                    imageId: "img-456",
                    imageType: "cover",
                    mimeType: "image/jpeg",
                });
            } catch (error: any) {
                const issues = error.issues;
                const authIssue = issues.find((issue: any) => issue.path.includes("authorization"));
                expect(authIssue.message).toBe(ERRORS.AUTHORIZATION.MISSING.CODE);
            }
        });

        it("should return proper error codes for experience ID errors", () => {
            try {
                ReplaceExperienceImageRequestSchema.parse({
                    authorization: "Bearer token",
                    imageId: "img-456",
                    imageType: "cover",
                    mimeType: "image/jpeg",
                });
            } catch (error: any) {
                const issues = error.issues;
                const expIssue = issues.find((issue: any) => issue.path.includes("experienceId"));
                expect(expIssue.message).toBe(ERRORS.EXPERIENCE.ID.MISSING.CODE);
            }
        });
    });
});