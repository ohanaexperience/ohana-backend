import stripe from "stripe";

import { WebhookServiceOptions } from "../types";
import { StripeWebhookData } from "../validations";

import Postgres from "@/database/postgres";
import { PaymentService } from "@/payments/services/payment";

export class WebhookService {
    private readonly db: Postgres;
    private readonly stripeClient: stripe;
    private readonly paymentService: PaymentService;

    private readonly config: any;

    constructor({ database, stripeClient, ...config }: WebhookServiceOptions) {
        this.db = database;
        this.stripeClient = stripeClient;
        this.paymentService = new PaymentService({ database });

        this.config = config;
    }

    async handleIdentityWebhook({ headers, body }: StripeWebhookData) {
        const stripeEvent = this.stripeClient.webhooks.constructEvent(
            body,
            headers["stripe-signature"],
            this.config.stripeWebhookSecret
        );

        console.log("Processing identity webhook event:", stripeEvent.type);

        switch (stripeEvent.type) {
            case "identity.verification_session.verified":
                const session = stripeEvent.data.object as any;
                const userId = session.metadata.user_id;

                console.log(
                    "Identity verification session successful:",
                    session
                );

                await this.db.hostVerifications.update(userId, {
                    status: "approved",
                    approvedAt: new Date(),
                });
                await this.db.hosts.create({
                    id: userId,
                });
                break;

            default:
                console.log(
                    `Unhandled identity event type: ${stripeEvent.type}`
                );
        }

        return { received: true };
    }

    async handlePaymentWebhook({ headers, body }: StripeWebhookData) {
        const stripeEvent = this.stripeClient.webhooks.constructEvent(
            body,
            headers["stripe-signature"],
            this.config.stripeWebhookSecret
        );

        console.log("Processing payment webhook event:", stripeEvent.type);

        // Delegate to payment service
        await this.paymentService.handleWebhook(stripeEvent);

        return { received: true };
    }
}
