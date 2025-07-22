import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

import {
    CreateExperienceRequest,
    DeleteExperienceRequest,
    PublicExperienceSearchRequest,
    UserExperienceSearchRequest,
    UpdateExperienceRequest,
} from "../validations";
import { ExperienceServiceOptions } from "../types";

import Postgres from "@/database/postgres";
import { S3Service } from "@/s3/services/s3";
import { decodeToken, generateTimeSlotsFromAvailability } from "@/utils";
import ERRORS from "@/errors";

export class ExperienceService {
    private readonly db: Postgres;
    private readonly s3Service?: S3Service;

    constructor({ database, s3Service }: ExperienceServiceOptions) {
        this.db = database;

        if (s3Service) {
            this.s3Service = s3Service;
        }
    }

    // Helper method to enrich experiences with related data
    private async enrichExperiencesWithRelatedData(experiences: any[]) {
        const enrichedExperiences = await Promise.all(
            experiences.map(async (experience) => {
                const [includedItems, guestRequirements] = await Promise.all([
                    this.db.experienceIncludedItems.getByExperienceId(experience.id),
                    this.db.experienceGuestRequirements.getByExperienceId(experience.id),
                ]);

                return {
                    ...experience,
                    includedItems,
                    guestRequirements,
                };
            })
        );

        return enrichedExperiences;
    }

    // Public User
    async publicGetExperiences(request: PublicExperienceSearchRequest) {
        const { ...queryParams } = request;

        const experiences = await this.db.experiences.searchExperiences(queryParams);
        return await this.enrichExperiencesWithRelatedData(experiences);
    }

    // Authenticated User
    async userGetExperiences(request: UserExperienceSearchRequest) {
        const { authorization, ...queryParams } = request;

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const experiences = await this.db.experiences.searchExperiences(queryParams);
        return await this.enrichExperiencesWithRelatedData(experiences);
    }

    // Host
    async hostGetExperiences(request: { authorization: string }) {
        const { authorization } = request;

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const host = await this.db.hosts.getByUserId(sub);

        if (!host) {
            throw new Error(ERRORS.HOST.NOT_FOUND.CODE);
        }

        const experiences = await this.db.experiences.getAllByHostId(host.id);
        return await this.enrichExperiencesWithRelatedData(experiences);
    }

    async hostCreateExperience(request: CreateExperienceRequest) {
        const {
            authorization,
            title,
            tagline,
            category,
            languages,
            type,
            description,
            startingLocation,
            endingLocation,
            meetingLocation,
            pricePerPerson,
            groupDiscounts,
            earlyBirdRate,
            cancellationPolicy,
            groupSize,
            includedItems,
            guestRequirements,
            physicalRequirements,
            ageRecommendations,
            durationHours,
            timezone,
            availability,
            images,
        } = request;

        if (!this.s3Service) {
            throw new Error("S3 service is required.");
        }

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const host = await this.db.hosts.getByUserId(sub);

        if (!host) {
            throw new Error(ERRORS.HOST.NOT_FOUND.CODE);
        }

        const categoryExists = await this.db.categories.getById(
            category.mainId
        );

        if (!categoryExists) {
            throw new Error(ERRORS.EXPERIENCE.CATEGORY.MAIN.INVALID_VALUE.CODE);
        }

        const subCategoryExists = await this.db.subCategories.getById(
            category.subId
        );

        if (!subCategoryExists) {
            throw new Error(ERRORS.EXPERIENCE.CATEGORY.SUB.INVALID_VALUE.CODE);
        }

        if (subCategoryExists.categoryId !== category.mainId) {
            throw new Error(ERRORS.EXPERIENCE.CATEGORY.MISMATCH.CODE);
        }

        const createdExperience = await this.db.experiences.create({
            hostId: host.id,
            title,
            tagline,
            categoryId: category.mainId,
            subCategoryId: category.subId,
            languages,
            type,
            description,
            startingLocationAddress: startingLocation.address,
            startingLocation: [
                startingLocation.longitude,
                startingLocation.latitude,
            ],
            endingLocationAddress: endingLocation.address,
            endingLocation: [endingLocation.longitude, endingLocation.latitude],
            meetingLocationInstructions: meetingLocation.instructions,
            meetingLocationImage: null,
            pricePerPerson,
            ...(groupDiscounts && {
                groupDiscountsEnabled: true,
                discountPercentageFor3Plus:
                    groupDiscounts.discountPercentageFor3Plus,
                discountPercentageFor5Plus:
                    groupDiscounts.discountPercentageFor5Plus,
            }),
            ...(earlyBirdRate && {
                earlyBirdEnabled: true,
                earlyBirdDiscountPercentage: earlyBirdRate.discountPercentage,
                earlyBirdDaysInAdvance: earlyBirdRate.daysInAdvance,
            }),
            cancellationPolicy,
            minGuests: groupSize.minGuests,
            maxGuests: groupSize.maxGuests,
            autoCancelEnabled: groupSize.autoCancelEnabled,
            physicalRequirements,
            ...(ageRecommendations && { ageRecommendation: ageRecommendations }),
            durationHours,
            timezone,
            status: "published",
            isPublic: true,
        });

        // Create included items if provided
        if (includedItems && includedItems.length > 0) {
            for (let i = 0; i < includedItems.length; i++) {
                await this.db.experienceIncludedItems.create({
                    experienceId: createdExperience.id,
                    icon: includedItems[i].icon,
                    text: includedItems[i].text,
                    sortOrder: i,
                });
            }
        }

        // Create guest requirements if provided
        if (guestRequirements && guestRequirements.length > 0) {
            for (let i = 0; i < guestRequirements.length; i++) {
                await this.db.experienceGuestRequirements.create({
                    experienceId: createdExperience.id,
                    icon: guestRequirements[i].icon,
                    text: guestRequirements[i].text,
                    sortOrder: i,
                });
            }
        }

        const createdAvailability = await this.db.availability.create({
            startDate: new Date(availability.startDate),
            ...(availability.daysOfWeek && {
                daysOfWeek: availability.daysOfWeek,
            }),
            timeSlots: availability.timeSlots,
            experienceId: createdExperience.id,
            maxCapacity: groupSize.maxGuests,
            ...(availability.endDate && {
                endDate: new Date(availability.endDate),
            }),
        });

        await generateTimeSlotsFromAvailability(
            this.db,
            {
                experienceId: createdExperience.id,
                availabilityId: createdAvailability.id,
                availability: {
                    startDate: dayjs(availability.startDate)
                        .tz(timezone)
                        .toDate(),
                    ...(availability.endDate && {
                        endDate: dayjs(availability.endDate)
                            .tz(timezone)
                            .toDate(),
                    }),
                    ...(availability.daysOfWeek && {
                        daysOfWeek: availability.daysOfWeek,
                    }),
                    timeSlots: availability.timeSlots,
                    maxCapacity: groupSize.maxGuests,
                },
                timezone,
            },
            1 // Months to generate time slots for
        );

        const imagesWithIds = images.map((image) => ({
            ...image,
            id: uuidv4(),
        }));
        const uploadUrls = await this.s3Service.getExperienceImageUploadUrls({
            authorization,
            experienceId: createdExperience.id,
            images: imagesWithIds,
        });

        // Enrich the created experience with the related data
        const [enrichedExperience] = await this.enrichExperiencesWithRelatedData([createdExperience]);

        return { createdExperience: enrichedExperience, uploadUrls };
    }

    async hostUpdateExperience(request: UpdateExperienceRequest) {
        const { authorization, experienceId, ...experienceData } = request;

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const host = await this.db.hosts.getByUserId(sub);

        if (!host) {
            throw new Error(ERRORS.HOST.NOT_FOUND.CODE);
        }

        const experience = await this.db.experiences.getById(experienceId);

        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        if (experience.hostId !== host.id) {
            throw new Error(ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE);
        }

        const { startingLocation, endingLocation, meetingLocation, ...restData } =
            experienceData;

        const updateData = {
            ...restData,
            ...(startingLocation && {
                startingLocationAddress: startingLocation.address,
                startingLocation: [
                    startingLocation.longitude,
                    startingLocation.latitude,
                ] as [number, number],
            }),
            ...(endingLocation && {
                endingLocationAddress: endingLocation.address,
                endingLocation: [
                    endingLocation.longitude,
                    endingLocation.latitude,
                ] as [number, number],
            }),
            ...(meetingLocation && {
                meetingLocationInstructions: meetingLocation.instructions,
                // Note: meetingLocationImage would need to be handled separately if updating images
            }),
        };

        const updatedExperience = await this.db.experiences.update(experienceId, updateData);
        
        // Enrich the updated experience with the related data
        const [enrichedExperience] = await this.enrichExperiencesWithRelatedData([updatedExperience]);
        
        return enrichedExperience;
    }

    async hostDeleteExperience(request: DeleteExperienceRequest) {
        const { authorization, experienceId } = request;

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const host = await this.db.hosts.getByUserId(sub);

        if (!host) {
            throw new Error(ERRORS.HOST.NOT_FOUND.CODE);
        }

        const experience = await this.db.experiences.getById(experienceId);

        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        if (experience.hostId !== host.id) {
            throw new Error(ERRORS.EXPERIENCE.FORBIDDEN_DELETE.CODE);
        }

        // Delete all S3 images associated with this experience
        if (this.s3Service) {
            try {
                await this.s3Service.deleteExperienceImages(experienceId);
            } catch (error) {
                console.error(`Failed to delete S3 images for experience ${experienceId}:`, error);
                // Continue with database deletion even if S3 cleanup fails
            }
        }

        await this.db.experiences.delete(experienceId);

        return {
            message: "Experience deleted successfully.",
        };
    }
}
