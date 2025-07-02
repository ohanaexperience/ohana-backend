import { ExperienceController } from "@/experiences/controllers/experience";
import { decodeToken } from "@/utils";
import { DecodedIdToken } from "@/types";
import ERRORS from "@/errors";

jest.mock("@/utils", () => ({
    decodeToken: jest.fn(),
    generateTimeSlotsFromAvailability: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("dayjs", () => {
    const mockDayjs = () => ({
        tz: jest.fn().mockReturnValue({
            toDate: jest.fn().mockReturnValue(new Date()),
        }),
    });
    mockDayjs.extend = jest.fn();
    return mockDayjs;
});

describe("ExperienceController", () => {
    let experienceController: ExperienceController;
    let mockDatabase: any;
    let mockS3Service: any;
    let mockDecodeToken: jest.MockedFunction<typeof decodeToken>;

    beforeEach(() => {
        mockDatabase = {
            experiences: {
                searchExperiences: jest.fn(),
                getAllByHostId: jest.fn(),
                create: jest.fn(),
                getById: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            hosts: {
                getByUserId: jest.fn(),
            },
            categories: {
                getById: jest.fn(),
            },
            subCategories: {
                getById: jest.fn(),
            },
            availability: {
                create: jest.fn(),
            },
        };

        mockS3Service = {
            getExperienceImageUploadUrls: jest.fn(),
            deleteExperienceImages: jest.fn(),
        };

        mockDecodeToken = decodeToken as jest.MockedFunction<typeof decodeToken>;

        experienceController = new ExperienceController({
            database: mockDatabase,
            s3Service: mockS3Service,
        });

        jest.clearAllMocks();
    });

    describe("publicGetExperiences", () => {
        it("should return experiences successfully", async () => {
            const mockExperiences = [
                { id: "1", title: "Experience 1" },
                { id: "2", title: "Experience 2" },
            ];
            mockDatabase.experiences.searchExperiences.mockResolvedValue(mockExperiences);

            const result = await experienceController.publicGetExperiences({
                categoryId: 1,
                title: "New York",
            });

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockExperiences);
            expect(mockDatabase.experiences.searchExperiences).toHaveBeenCalledWith({
                categoryId: 1,
                title: "New York",
            });
        });

        it("should handle errors gracefully", async () => {
            mockDatabase.experiences.searchExperiences.mockRejectedValue(
                new Error("Database error")
            );

            const result = await experienceController.publicGetExperiences({});

            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).error).toBe("Internal server error");
        });
    });

    describe("userGetExperiences", () => {
        it("should return experiences for authenticated user", async () => {
            const mockExperiences = [{ id: "1", title: "Experience 1" }];
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.experiences.searchExperiences.mockResolvedValue(mockExperiences);

            const result = await experienceController.userGetExperiences({
                authorization: "Bearer token",
                title: "San Francisco",
            });

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockExperiences);
            expect(mockDecodeToken).toHaveBeenCalledWith("Bearer token");
            expect(mockDatabase.experiences.searchExperiences).toHaveBeenCalledWith({
                title: "San Francisco",
            });
        });
    });

    describe("hostGetExperiences", () => {
        it("should return host's experiences successfully", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            const mockExperiences = [{ id: "1", title: "Host Experience" }];
            
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.experiences.getAllByHostId.mockResolvedValue(mockExperiences);

            const result = await experienceController.hostGetExperiences({
                authorization: "Bearer token",
            });

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockExperiences);
            expect(mockDatabase.hosts.getByUserId).toHaveBeenCalledWith("user123");
            expect(mockDatabase.experiences.getAllByHostId).toHaveBeenCalledWith("host123");
        });

        it("should return 400 when host not found", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(null);

            const result = await experienceController.hostGetExperiences({
                authorization: "Bearer token",
            });

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(ERRORS.HOST.NOT_FOUND.CODE);
        });
    });

    describe("hostCreateExperience", () => {
        const mockCreateRequest = {
            authorization: "Bearer token",
            title: "New Experience",
            tagline: "Amazing experience",
            category: { mainId: 1, subId: 1 },
            languages: ["en"],
            experienceType: "individual",
            description: "Test description",
            startingLocation: { address: "Start", longitude: -122.4, latitude: 37.7 },
            endingLocation: { address: "End", longitude: -122.3, latitude: 37.8 },
            meetingLocation: { instructions: "Meet here" },
            pricePerPerson: 50,
            cancellationPolicy: "flexible",
            groupSize: { minGuests: 1, maxGuests: 10, autoCancelEnabled: false },
            includedItems: ["item1"],
            physicalRequirements: "none",
            ageRecommendations: "all",
            accessibilityInfo: "accessible",
            durationHours: 2,
            timezone: "America/Los_Angeles",
            availability: {
                startDate: "2024-01-01",
                daysOfWeek: [1, 2, 3],
                timeSlots: ["09:00"],
            },
            images: [{ mimeType: "image/jpeg", imageType: "cover" }],
        };

        it("should create experience successfully", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            const mockCategory = { id: 1, name: "Category" };
            const mockSubCategory = { id: 1, name: "SubCategory", categoryId: 1 };
            const mockExperience = { id: "exp123", title: "New Experience" };
            const mockAvailability = { id: "avail123" };
            const mockUploadUrls = { coverImage: "https://upload-url" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.categories.getById.mockResolvedValue(mockCategory);
            mockDatabase.subCategories.getById.mockResolvedValue(mockSubCategory);
            mockDatabase.experiences.create.mockResolvedValue(mockExperience);
            mockDatabase.availability.create.mockResolvedValue(mockAvailability);
            mockS3Service.getExperienceImageUploadUrls.mockResolvedValue(mockUploadUrls);

            const result = await experienceController.hostCreateExperience(mockCreateRequest);

            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.createdExperience).toEqual(mockExperience);
            expect(responseBody.uploadUrls).toEqual(mockUploadUrls);
        });

        it("should return 400 when host not found", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(null);

            const result = await experienceController.hostCreateExperience(mockCreateRequest);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(ERRORS.HOST.NOT_FOUND.CODE);
        });

        it("should return 400 when main category is invalid", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.categories.getById.mockResolvedValue(null);

            const result = await experienceController.hostCreateExperience(mockCreateRequest);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(
                ERRORS.EXPERIENCE.CATEGORY.MAIN.INVALID_VALUE.CODE
            );
        });

        it("should return 400 when sub category is invalid", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            const mockCategory = { id: 1, name: "Category" };
            
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.categories.getById.mockResolvedValue(mockCategory);
            mockDatabase.subCategories.getById.mockResolvedValue(null);

            const result = await experienceController.hostCreateExperience(mockCreateRequest);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(
                ERRORS.EXPERIENCE.CATEGORY.SUB.INVALID_VALUE.CODE
            );
        });

        it("should return 400 when category mismatch", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            const mockCategory = { id: 1, name: "Category" };
            const mockSubCategory = { id: 1, name: "SubCategory", categoryId: 2 };
            
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.categories.getById.mockResolvedValue(mockCategory);
            mockDatabase.subCategories.getById.mockResolvedValue(mockSubCategory);

            const result = await experienceController.hostCreateExperience(mockCreateRequest);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(
                ERRORS.EXPERIENCE.CATEGORY.MISMATCH.CODE
            );
        });
    });

    describe("hostUpdateExperience", () => {
        const mockUpdateRequest = {
            authorization: "Bearer token",
            experienceId: "exp123",
            title: "Updated Experience",
            startingLocation: { address: "New Start", longitude: -122.5, latitude: 37.6 },
        };

        it("should update experience successfully", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            const mockExperience = { id: "exp123", hostId: "host123" };
            const mockUpdatedExperience = { id: "exp123", title: "Updated Experience" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.experiences.update.mockResolvedValue(mockUpdatedExperience);

            const result = await experienceController.hostUpdateExperience(mockUpdateRequest);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockUpdatedExperience);
            expect(mockDatabase.experiences.update).toHaveBeenCalledWith("exp123", {
                title: "Updated Experience",
                startingLocationAddress: "New Start",
                startingLocation: [-122.5, 37.6],
            });
        });

        it("should return 400 when experience not found", async () => {
            const mockHost = { id: "host123", userId: "user123" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.experiences.getById.mockResolvedValue(null);

            const result = await experienceController.hostUpdateExperience(mockUpdateRequest);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        });

        it("should return 403 when host tries to update another host's experience", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            const mockExperience = { id: "exp123", hostId: "host456" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);

            const result = await experienceController.hostUpdateExperience(mockUpdateRequest);

            expect(result.statusCode).toBe(403);
            expect(JSON.parse(result.body).error).toBe(
                ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE
            );
        });
    });

    describe("hostDeleteExperience", () => {
        const mockDeleteRequest = {
            authorization: "Bearer token",
            experienceId: "exp123",
        };

        it("should delete experience successfully", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            const mockExperience = { id: "exp123", hostId: "host123" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);
            mockDatabase.experiences.delete.mockResolvedValue(undefined);

            const result = await experienceController.hostDeleteExperience(mockDeleteRequest);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).message).toBe("Experience deleted successfully.");
            expect(mockDatabase.experiences.delete).toHaveBeenCalledWith("exp123");
        });

        it("should return 400 when experience not found", async () => {
            const mockHost = { id: "host123", userId: "user123" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.experiences.getById.mockResolvedValue(null);

            const result = await experienceController.hostDeleteExperience(mockDeleteRequest);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        });

        it("should return 403 when host tries to delete another host's experience", async () => {
            const mockHost = { id: "host123", userId: "user123" };
            const mockExperience = { id: "exp123", hostId: "host456" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.experiences.getById.mockResolvedValue(mockExperience);

            const result = await experienceController.hostDeleteExperience(mockDeleteRequest);

            expect(result.statusCode).toBe(403);
            expect(JSON.parse(result.body).error).toBe(
                ERRORS.EXPERIENCE.FORBIDDEN_DELETE.CODE
            );
        });
    });
});