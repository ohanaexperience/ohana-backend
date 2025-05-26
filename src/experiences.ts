import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import DatabaseFactory from "./database/database_factory";
import { decodeToken } from "./utils";
import { requireBody, zodValidator } from "./middleware";
import {
    CreateExperienceSchema,
    CreateExperienceData,
} from "./constants/validations";
import ERRORS from "./constants/errors";

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

export const createExperience = middy(async (event: CreateExperienceData) => {
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
        meeting,
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
        experienceDuration,
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

        await db.experiences.create({
            hostId: host.id,
            title,
            tagline,
            category,
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
            meeting,
            pricePerPerson,
            cancellationPolicy,
            groupSize,
            coverImageUrl,
            galleryImageUrls,
            includedItems,
            whatToBring,
            physicalRequirements,
            ageRecommendations,
            experienceDuration,
            availability,
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
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator(CreateExperienceSchema))
    .use(cors());
