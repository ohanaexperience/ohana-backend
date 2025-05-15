import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import dayjs from "dayjs";
import stripe from "stripe";
import { APIGatewayEvent } from "aws-lambda";

import DatabaseFactory from "./database/database_factory";
import { decodeToken } from "./utils/jwt";
import ERRORS from "./constants/validations/errors";

const {
    STRIPE_SECRET_KEY,
    DB_ENDPOINT,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
} = process.env;

const stripeClient = new stripe(STRIPE_SECRET_KEY);
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

const handleExistingVerification = async (hostVerification, sub) => {
    if (!hostVerification.providerData) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND.CODE,
                message: ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND.MESSAGE,
            }),
        };
    }

    const { verificationSession, ephemeralKey } = hostVerification.providerData;
    const timeNowUnix = dayjs().unix();

    if (ephemeralKey.expires < timeNowUnix) {
        const newEphemeralKey = await stripeClient.ephemeralKeys.create(
            { verification_session: verificationSession.id },
            { apiVersion: "2025-04-30.basil" }
        );

        await db.hostVerifications.update(sub, {
            providerData: {
                ...hostVerification.providerData,
                ephemeralKey: newEphemeralKey,
            },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                clientSecret: verificationSession.client_secret,
                ephemeralKey: newEphemeralKey.secret,
            }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            clientSecret: verificationSession.client_secret,
            ephemeralKey: ephemeralKey.secret,
        }),
    };
};

const createNewVerification = async (sub) => {
    const session = await stripeClient.identity.verificationSessions.create({
        type: "document",
        metadata: { user_id: sub },
        options: {
            document: {
                allowed_types: ["driving_license", "id_card", "passport"],
                require_matching_selfie: true,
            },
        },
    });

    const ephemeralKey = await stripeClient.ephemeralKeys.create(
        { verification_session: session.id },
        { apiVersion: "2025-04-30.basil" }
    );

    if (!session.client_secret || !ephemeralKey.secret) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE,
                message: ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.MESSAGE,
            }),
        };
    }

    await db.hostVerifications.create({
        userId: sub,
        provider: "stripe_identity",
        providerData: { verificationSession: session, ephemeralKey },
        status: "pending",
        submittedAt: new Date(),
    });

    return {
        statusCode: 200,
        body: JSON.stringify({
            clientSecret: session.client_secret,
            ephemeralKey: ephemeralKey.secret,
        }),
    };
};

export const createVerificationSession = middy(
    async (event: APIGatewayEvent) => {
        const { authorization } = event.headers;

        if (!authorization) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Unauthorized" }),
            };
        }

        try {
            const { sub } = decodeToken(authorization);
            const hostVerification = await db.hostVerifications.getByUserId(
                sub
            );

            if (hostVerification.length > 0) {
                if (hostVerification[0].status === "approved") {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            error: ERRORS.STRIPE.VERIFICATION.ALREADY_APPROVED
                                .CODE,
                            message:
                                ERRORS.STRIPE.VERIFICATION.ALREADY_APPROVED
                                    .MESSAGE,
                        }),
                    };
                }

                return handleExistingVerification(hostVerification[0], sub);
            }

            return createNewVerification(sub);
        } catch (err) {
            console.error("Error creating verification session:", err);

            return {
                statusCode: err.statusCode || 500,
                body: JSON.stringify({
                    error: err.__type || "Internal server error",
                    message: err.message || "An unexpected error occurred",
                }),
            };
        }
    }
)
    .use(httpHeaderNormalizer())
    .use(cors());
