import Postgres from "@/database/postgres";
import stripe from "stripe";

export interface WebhookServiceOptions {
    // Dependencies
    database: Postgres;
    stripeClient: stripe;

    // Config
    stripeWebhookSecret: string;
}
