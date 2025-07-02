import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { APIGatewayEvent } from "aws-lambda";

import { DatabaseFactory } from "@/database";
import { requireBody, zodValidator } from "./middleware";
import { UpdateHostProfileSchema, UpdateHostProfileData } from "@/validations";
import { decodeToken } from "./utils";
import ERRORS from "@/errors";

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
