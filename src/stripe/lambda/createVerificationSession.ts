import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayEvent } from "aws-lambda";

import stripe from "stripe";

import { StripeController } from "../controllers/stripe";

import { DatabaseFactory } from "@/database";

const {
    DB_ENDPOINT,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    STRIPE_SECRET_KEY,
} = process.env;

const stripeClient = new stripe(STRIPE_SECRET_KEY!);
const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT!,
        port: parseInt(DB_PORT!),
        database: DB_NAME!,
        user: DB_USER!,
        password: DB_PASSWORD!,
        ssl: false,
    },
});
const stripeController = new StripeController({
    database: db,
    stripeClient,
});

export const handler = middy(async (event: APIGatewayEvent) => {
    const { authorization } = event.headers;

    console.log("event", event);

    return await stripeController.createVerificationSession({
        authorization: authorization!,
    });
})
    .use(httpHeaderNormalizer())
    .use(cors());
