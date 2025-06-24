import stripe from "stripe";

import { WebhookServiceOptions } from "../types";
import { StripeWebhookData } from "../validations";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";

export class WebhookService {
    private readonly db: Postgres;
    private readonly stripeClient: stripe;

    private readonly config: any;

    constructor({ database, stripeClient, ...config }: WebhookServiceOptions) {
        this.db = database;
        this.stripeClient = stripeClient;

        this.config = config;
    }

    async handleStripeWebhook({ headers, body }: StripeWebhookData) {
        const stripeEvent = this.stripeClient.webhooks.constructEvent(
            body,
            headers["stripe-signature"],
            this.config.stripeWebhookSecret
        );

        if (stripeEvent.type === "identity.verification_session.verified") {
            const session = stripeEvent.data.object;
            const userId = session.metadata.user_id;

            console.log("Identity verification session successful:", session);

            await this.db.hostVerifications.update(userId, {
                status: "approved",
                approvedAt: new Date(),
            });
            await this.db.hosts.create({
                id: userId,
            });
        }

        return {};
    }
}
