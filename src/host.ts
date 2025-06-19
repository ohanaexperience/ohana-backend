import { randomUUID } from "crypto";

import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import dayjs from "dayjs";
import { extension } from "mime-types";

import { APIGatewayEvent } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { DatabaseFactory } from "@/database";
import { requireBody, zodValidator } from "./middleware";
import {
    UpdateHostProfileSchema,
    UpdateHostProfileData,
    GetExperienceImageUploadUrlsSchema,
    GetExperienceImageUploadUrlsData,
} from "@/validations";
import { decodeToken } from "./utils";
import ERRORS from "@/errors";

const {
    DB_ENDPOINT,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    ASSETS_BUCKET_NAME,
} = process.env;

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
const s3Client = new S3Client({
    region: "us-east-1",
});

export const getProfile = middy(async (event: APIGatewayEvent) => {
    const { authorization } = event.headers;

    if (!authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized" }),
        };
    }

    try {
        const { sub } = decodeToken(authorization);

        const hostVerification = await db.hostVerifications.getByUserId(sub);

        if (!hostVerification) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE,
                    message: ERRORS.HOST_VERIFICATION.NOT_VERIFIED.MESSAGE,
                }),
            };
        }

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

        const { id, createdAt, updatedAt, ...publicHostInfo } = host;

        const cleanedHostInfo = Object.fromEntries(
            Object.entries(publicHostInfo).filter(
                ([_, value]) => value !== null
            )
        );

        console.log("Host profile retrieved:", cleanedHostInfo);

        return {
            statusCode: 200,
            body: JSON.stringify(cleanedHostInfo),
        };
    } catch (err: unknown) {
        console.error("Error getting host profile:", err);

        if (err instanceof Error) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Internal server error",
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

export const updateProfile = middy(async (event: UpdateHostProfileData) => {
    const { authorization } = event.headers;
    const { bio, languages } = event.body;

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

        const hostVerification = await db.hostVerifications.getByUserId(sub);

        if (!hostVerification) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE,
                    message: ERRORS.HOST_VERIFICATION.NOT_VERIFIED.MESSAGE,
                }),
            };
        }

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

        await db.hosts.update(sub, { bio, languages });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Host profile updated successfully.",
            }),
        };
    } catch (err: any) {
        console.error("Error updating host profile:", err);

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
    .use(zodValidator({ body: UpdateHostProfileSchema }))
    .use(cors());

export const getExperienceImageUploadUrls = middy(
    async (event: GetExperienceImageUploadUrlsData) => {
        const { authorization } = event.headers;

        if (!authorization) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    error: "Unauthorized",
                }),
            };
        }

        const { experienceId, images } = event.body;

        try {
            const { sub } = decodeToken(authorization);

            const experience = await db.experiences.getById(experienceId);

            if (!experience) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.NOT_FOUND.CODE,
                        message: ERRORS.EXPERIENCE.NOT_FOUND.MESSAGE,
                    }),
                };
            }

            const coverImages = images.filter(
                (img) => img.imageType === "cover"
            );
            const galleryImages = images.filter(
                (img) => img.imageType === "gallery"
            );
            const meetingLocationImages = images.filter(
                (img) => img.imageType === "meeting-location"
            );

            const coverUploadResults = await Promise.allSettled(
                coverImages.map((image) =>
                    generateUploadUrl({
                        image,
                        experienceId,
                        userId: sub,
                        imageType: "cover",
                    })
                )
            );

            const galleryUploadResults = await Promise.allSettled(
                galleryImages.map((image) =>
                    generateUploadUrl({
                        image,
                        experienceId,
                        userId: sub,
                        imageType: "gallery",
                    })
                )
            );

            const meetingLocationUploadResults = await Promise.allSettled(
                meetingLocationImages.map((image) =>
                    generateUploadUrl({
                        image,
                        experienceId,
                        userId: sub,
                        imageType: "meeting-location",
                    })
                )
            );

            // Extract successful uploads
            const coverUploadUrl =
                coverUploadResults.map(
                    (result) => (result as PromiseFulfilledResult<any>).value
                )[0] || null;

            const galleryUploadUrls = galleryUploadResults.map(
                (result) => (result as PromiseFulfilledResult<any>).value
            );

            const meetingLocationUploadUrls = meetingLocationUploadResults.map(
                (result) => (result as PromiseFulfilledResult<any>).value
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    coverUploadUrl,
                    ...(galleryUploadUrls.length > 0 && { galleryUploadUrls }),
                    ...(meetingLocationUploadUrls.length > 0 && {
                        meetingLocationUploadUrls,
                    }),
                }),
            };
        } catch (err: unknown) {
            console.error("Error creating pre-signed URL:", err);

            if (err instanceof Error) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "Internal server error",
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
    .use(zodValidator({ body: GetExperienceImageUploadUrlsSchema }))
    .use(cors());

function generateKeyPrefix(
    userId: string,
    experienceId: string,
    imageType: string
) {
    switch (imageType) {
        case "cover":
            return `hosts/${userId}/experiences/${experienceId}/images/cover`;
        case "gallery":
            return `hosts/${userId}/experiences/${experienceId}/images/gallery`;
        case "meeting-location":
            return `hosts/${userId}/experiences/${experienceId}/images/meeting-location`;
    }
}

async function generateUploadUrl({
    image,
    experienceId,
    userId,
    imageType,
}: {
    image: { mimeType: string };
    experienceId: string;
    userId: string;
    imageType: string;
}) {
    const fileExtension = extension(image.mimeType);
    const fileName = `${randomUUID()}.${fileExtension}`;
    const keyPrefix = generateKeyPrefix(userId, experienceId, imageType);
    const key = `${keyPrefix}/${fileName}`;

    const command = new PutObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: key,
        ContentType: image.mimeType,
        Metadata: {
            userId,
            imageType,
            uploadedAt: dayjs().toISOString(),
        },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    // return {
    //     uploadUrl,
    //     key,
    //     fileName,
    //     mimeType: image.mimeType,
    // };
    return uploadUrl;
}
