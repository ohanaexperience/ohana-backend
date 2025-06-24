import dayjs from "dayjs";

import {
    CreateExperienceRequest,
    DeleteExperienceRequest,
    ExperienceSearchRequest,
    UpdateExperienceRequest,
} from "../validations";
import { ExperienceServiceOptions } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken, generateTimeSlotsFromAvailability } from "@/utils";
import ERRORS from "@/errors";

export class ExperienceService {
    private readonly db: Postgres;

    constructor({ database }: ExperienceServiceOptions) {
        this.db = database;
    }

    // Authenticated User
    async getExperiences(request: ExperienceSearchRequest) {
        const { authorization, ...queryParams } = request;

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        return await this.db.experiences.searchExperiences(queryParams);
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

        return await this.db.experiences.getAllByHostId(host.id);
    }

    async hostCreateExperience(request: CreateExperienceRequest) {
        const {
            authorization,
            title,
            tagline,
            category,
            languages,
            experienceType,
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
            whatToBring,
            physicalRequirements,
            ageRecommendations,
            accessibilityInfo,
            durationHours,
            timezone,
            availability,
        } = request;

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
            experienceType,
            description,
            startingLocationAddress: startingLocation.address,
            startingLocation: [
                startingLocation.longitude,
                startingLocation.latitude,
            ],
            endingLocationAddress: endingLocation.address,
            endingLocation: [endingLocation.longitude, endingLocation.latitude],
            meetingLocation: {
                instructions: meetingLocation.instructions,
                imageUrl: meetingLocation.imageUrl!,
            },
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
            // coverImageUrl,
            // ...(galleryImageUrls && { galleryImageUrls }),
            includedItems,
            ...(whatToBring && { whatToBring }),
            physicalRequirements,
            ageRange: ageRecommendations,
            accessibilityInfo,
            durationHours,
            timezone,
            status: "published",
            isPublic: true,
        });

        const createdAvailability = await this.db.availability.create({
            startDate: new Date(availability.startDate),
            daysOfWeek: availability.daysOfWeek,
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
                    startDate: dayjs().tz(timezone).toDate(),
                    endDate: availability.endDate
                        ? dayjs(availability.endDate).tz(timezone).toDate()
                        : undefined,
                    daysOfWeek: availability.daysOfWeek,
                    timeSlots: availability.timeSlots,
                    maxCapacity: groupSize.maxGuests,
                },
                timezone,
            },
            1
        );

        return createdExperience;
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

        const { startingLocation, endingLocation, ...restData } =
            experienceData;

        const updateData = {
            ...restData,
            ...(startingLocation && {
                startingLocationAddress: startingLocation.address,
                startingLocation: [
                    startingLocation.longitude,
                    startingLocation.latitude,
                ],
            }),
            ...(endingLocation && {
                endingLocationAddress: endingLocation.address,
                endingLocation: [
                    endingLocation.longitude,
                    endingLocation.latitude,
                ],
            }),
        };

        return await this.db.experiences.update(experienceId, updateData);
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

        await this.db.experiences.delete(experienceId);

        return {
            message: "Experience deleted successfully.",
        };
    }
}
