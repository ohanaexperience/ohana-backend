import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { APIGatewayEvent } from "aws-lambda";

import stripe from "stripe";

import DatabaseFactory from "./database/database_factory";
import { decodeToken } from "./utils/jwt";

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

export const createVerificationSession = middy(
    async (event: APIGatewayEvent) => {
        console.log("event", event);

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
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        clientSecret: hostVerification[0].sessionClientSecret,
                    }),
                };
            }

            const session =
                await stripeClient.identity.verificationSessions.create({
                    type: "document",
                    metadata: {
                        user_id: sub,
                    },
                    options: {
                        document: {
                            allowed_types: [
                                "driving_license",
                                "id_card",
                                "passport",
                            ],
                            require_matching_selfie: true,
                        },
                    },
                });

            if (!session.client_secret) {
                throw new Error("Failed to create verification session");
            }

            await db.hostVerifications.create({
                userId: sub,
                provider: "stripe_identity",
                providerVerificationId: session.id,
                sessionClientSecret: session.client_secret,
                status: "pending",
                submittedAt: new Date(),
            });

            console.log("Verification session successfully created:", session);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    clientSecret: session.client_secret,
                }),
            };
        } catch (err) {
            console.error("Error creating verification session:", err);

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
    .use(cors());
