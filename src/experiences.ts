import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { APIGatewayEvent } from "aws-lambda";

import DatabaseFactory from "./database/database_factory";
import { decodeToken } from "./utils";
import { requireBody, zodValidator } from "./middleware";
import { CreateExperienceSchema, CreateExperienceData } from "@/validations";
import ERRORS from "@/errors";
import { EXPERIENCE_GROUP_SIZE_AUTO_CANCEL_HOURS } from "@/constants/experiences";

const { DB_ENDPOINT, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: false,
    },
});

// Registered User Experience Endpoints
export const getExperiences = middy(async (event: APIGatewayEvent) => {
    const { authorization } = event.headers;

    console.log("event", event);

    if (!authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized" }),
        };
    }

    try {
        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const host = await db.hosts.getByUserId(sub);

        if (!host) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.HOST.NOT_FOUND.CODE,
                    message: ERRORS.HOST.NOT_FOUND.MESSAGE,
                }),
            };
        }

        const hostExperiences = await db.experiences.getAllByHostId(host.id);

        return {
            statusCode: 200,
            body: JSON.stringify(hostExperiences),
        };
    } catch (err: any) {
        console.error("Error getting host experiences:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal server error",
                message: "An unexpected error occurred",
            }),
        };
    }
})
    .use(httpHeaderNormalizer())
    .use(cors());

// Host Experience Endpoints
export const hostCreateExperience = middy(
    async (event: CreateExperienceData) => {
        const { authorization } = event.headers;
        const {
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
            coverImageUrl,
            galleryImageUrls,
            includedItems,
            whatToBring,
            physicalRequirements,
            ageRecommendations,
            accessibilityInfo,
            durationHours,
            timezone,
            availability,
        } = event.body;

        console.log("event", event);

        if (!authorization) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Unauthorized" }),
            };
        }

        try {
            const { sub } = decodeToken(authorization);

            console.log("sub", sub);

            const host = await db.hosts.getByUserId(sub);

            if (!host) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.HOST.NOT_FOUND.CODE,
                        message: ERRORS.HOST.NOT_FOUND.MESSAGE,
                    }),
                };
            }

            const categoryExists = await db.categories.getById(category.mainId);

            if (!categoryExists) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Main category not found" }),
                };
            }

            const subCategoryExists = await db.subCategories.getById(
                category.subId
            );

            if (
                !subCategoryExists ||
                subCategoryExists.categoryId !== category.mainId
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: "Sub category not found or doesn't belong to category.",
                    }),
                };
            }

            const createdExperience = await db.experiences.create({
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
                endingLocation: [
                    endingLocation.longitude,
                    endingLocation.latitude,
                ],
                meetingLocation: {
                    instructions: meetingLocation.instructions,
                    imageUrl: meetingLocation.imageUrl || "",
                },
                pricePerPerson,
                cancellationPolicy,
                minGuests: groupSize.minGuests,
                maxGuests: groupSize.maxGuests,
                autoCancelEnabled: groupSize.autoCancelEnabled,
                autoCancelHours: EXPERIENCE_GROUP_SIZE_AUTO_CANCEL_HOURS,
                coverImageUrl,
                galleryImageUrls,
                includedItems,
                whatToBring: whatToBring || "",
                physicalRequirements: physicalRequirements || "",
                ageRange: ageRecommendations,
                accessibilityInfo,
                durationHours,
                timezone,
                status: "published",
                isPublic: true,
                ...(groupDiscounts && {
                    groupDiscountsEnabled: true,
                    discountPercentageFor3Plus:
                        groupDiscounts.discountPercentageFor3Plus,
                    discountPercentageFor5Plus:
                        groupDiscounts.discountPercentageFor5Plus,
                }),
                ...(earlyBirdRate && {
                    earlyBirdEnabled: true,
                    earlyBirdDiscountPercentage:
                        earlyBirdRate.discountPercentage,
                    earlyBirdDaysInAdvance: earlyBirdRate.daysInAdvance,
                }),
            });

            await db.experiences.createAvailability({
                startDate: new Date(availability.startDate),
                daysOfWeek: availability.daysOfWeek,
                timeSlots: availability.timeSlots,
                experienceId: createdExperience.id,
                maxCapacity: groupSize.maxGuests,
                ...(availability.endDate && {
                    endDate: new Date(availability.endDate),
                }),
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Experience created successfully.",
                }),
            };
        } catch (err: any) {
            console.error("Error creating experience:", err);

            if (err.message) {
                return {
                    statusCode: err.statusCode,
                    body: JSON.stringify({
                        error: err.__type,
                        message: err.message,
                    }),
                };
            }

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Internal server error",
                    message: "An unexpected error occurred",
                }),
            };
        }
    }
)
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator(CreateExperienceSchema))
    .use(cors());

export const hostGetExperiences = middy(async (event: CreateExperienceData) => {
    const { authorization } = event.headers;

    console.log("event", event);

    if (!authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized" }),
        };
    }

    try {
        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const host = await db.hosts.getByUserId(sub);

        if (!host) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.HOST.NOT_FOUND.CODE,
                    message: ERRORS.HOST.NOT_FOUND.MESSAGE,
                }),
            };
        }

        const hostExperiences = await db.experiences.getAllByHostId(host.id);

        return {
            statusCode: 200,
            body: JSON.stringify(hostExperiences),
        };
    } catch (err: any) {
        console.error("Error getting host experiences:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal server error",
                message: "An unexpected error occurred",
            }),
        };
    }
})
    .use(httpHeaderNormalizer())
    .use(cors());
