import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import stripe from "stripe";

import { APIGatewayEvent } from "aws-lambda";

import { DatabaseFactory } from "@/database";

const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;

const stripeClient = new stripe(STRIPE_SECRET_KEY);

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

export const stripeWebhook = middy(async (event: APIGatewayEvent) => {
    console.log("event", event);

    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "MISSING_REQUEST_BODY",
                message: "A request body is required.",
            }),
        };
    }

    if (!event.headers["stripe-signature"]) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "MISSING_STRIPE_SIGNATURE",
                message: "A stripe-signature is required.",
            }),
        };
    }

    const signature = event.headers["stripe-signature"];

    try {
        const stripeEvent = stripeClient.webhooks.constructEvent(
            event.body,
            signature,
            STRIPE_WEBHOOK_SECRET
        );

        if (stripeEvent.type === "identity.verification_session.verified") {
            const session = stripeEvent.data.object;
            const userId = session.metadata.user_id;

            console.log("Identity verification session successful:", session);

            await db.hostVerifications.update(userId, {
                status: "approved",
                approvedAt: new Date(),
            });
            await db.hosts.create({
                id: userId,
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({}),
        };
    } catch (err: any) {
        console.error("Error creating user with email:", err);

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
