import Postgres from "@/database/postgres";
import stripe from "stripe";

export interface StripeServiceOptions {
    database: Postgres;
    stripeClient: stripe;
}
