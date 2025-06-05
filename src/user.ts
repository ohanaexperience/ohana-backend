import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import dayjs from "dayjs";
import { extension } from "mime-types";

import { APIGatewayEvent } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import DatabaseFactory from "./database/database_factory";

import { decodeToken } from "./utils/jwt";
import {
    requireBody,
    requireQueryStringParameters,
    zodValidator,
} from "./middleware";
import {
    UpdateUserProfileSchema,
    UpdateUserProfileData,
    GetProfileImageUploadUrlSchema,
    GetProfileImageUploadUrlData,
} from "@/validations";
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

        const user = await db.users.getByUserId(sub);

        if (!user) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.USER.NOT_FOUND.CODE,
                    message: ERRORS.USER.NOT_FOUND.MESSAGE,
                }),
            };
        }

        const { id, createdAt, updatedAt, ...publicUserInfo } = user;

        const cleanedUserInfo = Object.fromEntries(
            Object.entries(publicUserInfo).filter(
                ([_, value]) => value !== null
            )
        );

        console.log("User profile retrieved:", cleanedUserInfo);

        return {
            statusCode: 200,
            body: JSON.stringify(cleanedUserInfo),
        };
    } catch (err: unknown) {
        console.error("Error getting user profile:", err);

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

export const updateProfile = middy(async (event: UpdateUserProfileData) => {
    const { authorization } = event.headers;
    const { firstName, lastName, phoneNumber, profileImageUrl } = event.body;

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

        const user = await db.users.getByUserId(sub);

        if (!user) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.USER.NOT_FOUND.CODE,
                    message: ERRORS.USER.NOT_FOUND.MESSAGE,
                }),
            };
        }

        const updatedUser = await db.users.update(sub, {
            firstName,
            lastName,
            phoneNumber,
            profileImageUrl,
            updatedAt: new Date(),
        });
        console.log("updatedUser", updatedUser);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "User profile successfully updated.",
            }),
        };
    } catch (err: unknown) {
        console.error("Error updating user profile:", err);

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
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: UpdateUserProfileSchema }))
    .use(cors());

export const getProfileImageUploadUrl = middy(
    async (event: GetProfileImageUploadUrlData) => {
        const { authorization } = event.headers;

        if (!authorization) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    error: "Unauthorized",
                }),
            };
        }

        console.log("event", event);

        const { mimeType } = event.queryStringParameters;

        try {
            const fileExtension = extension(mimeType);

            const { sub } = decodeToken(authorization);
            const timeNowUnix = dayjs().unix();

            const fileName = `${sub}_${timeNowUnix}.${fileExtension}`;
            const key = `users/${sub}/profile/images/${fileName}`;

            const command = new PutObjectCommand({
                Bucket: ASSETS_BUCKET_NAME,
                Key: key,
                ContentType: mimeType,
            });

            const preSignedUrl = await getSignedUrl(s3Client, command, {
                expiresIn: 600,
            });

            return {
                statusCode: 200,
                body: JSON.stringify({ uploadUrl: preSignedUrl }),
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
    .use(requireQueryStringParameters())
    .use(
        zodValidator({ queryStringParameters: GetProfileImageUploadUrlSchema })
    )
    .use(cors());
