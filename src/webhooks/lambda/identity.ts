import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import stripe from "stripe";

import { WebhookController } from "../controllers/webhook";
import { StripeWebhookSchema, StripeWebhookData } from "../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireBody, zodValidator } from "@/middleware";

const {
    STRIPE_SECRET_KEY_LIVE,
    STRIPE_IDENTITY_WEBHOOK_SECRET,
} = process.env;

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const stripeClient = new stripe(STRIPE_SECRET_KEY_LIVE!);
const webhookController = new WebhookController({
    database: db,
    stripeClient,
    stripeWebhookSecret: STRIPE_IDENTITY_WEBHOOK_SECRET!,
});

export const handler = middy(async (event: StripeWebhookData) => {
    console.log("Identity webhook event received", event.headers);

    return await webhookController.handleIdentityWebhook(event);
})
    .use(httpHeaderNormalizer())
    .use(requireBody())
    .use(
        zodValidator({
            headers: StripeWebhookSchema,
        })
    )
    .use(cors());
