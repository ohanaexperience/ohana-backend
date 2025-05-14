import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import stripe from "stripe";

import { APIGatewayEvent } from "aws-lambda";

const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;

const stripeClient = new stripe(STRIPE_SECRET_KEY);

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

            console.log("Identity verification session successful:", session);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "User successfully created.",
            }),
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
