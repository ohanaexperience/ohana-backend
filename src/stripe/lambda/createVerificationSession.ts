import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayEvent } from "aws-lambda";

import stripe from "stripe";

import { StripeController } from "../controllers/stripe";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const {
    STRIPE_SECRET_KEY_LIVE,
} = process.env;

const stripeClient = new stripe(STRIPE_SECRET_KEY_LIVE!);
const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
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
