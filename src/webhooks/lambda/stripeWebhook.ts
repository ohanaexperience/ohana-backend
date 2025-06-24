import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import stripe from "stripe";

import { WebhookController } from "../controllers/webhook";
import { StripeWebhookSchema, StripeWebhookData } from "../validations";

import { DatabaseFactory } from "@/database";
import { requireBody, zodValidator } from "@/middleware";

const {
    DB_ENDPOINT,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
} = process.env;

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
const stripeClient = new stripe(STRIPE_SECRET_KEY!);
const webhookController = new WebhookController({
    database: db,
    stripeClient,
    stripeWebhookSecret: STRIPE_WEBHOOK_SECRET!,
});

export const handler = middy(async (event: StripeWebhookData) => {
    console.log("event", event);

    return await webhookController.handleStripeWebhook(event);
})
    .use(httpHeaderNormalizer())
    .use(requireBody())
    .use(
        zodValidator({
            headers: StripeWebhookSchema,
        })
    )
    .use(cors());
