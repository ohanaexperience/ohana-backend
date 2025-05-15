import {
    pgTable,
    pgEnum,
    uuid,
    serial,
    timestamp,
    text,
    jsonb,
} from "drizzle-orm/pg-core";

import Stripe from "stripe";

import { usersTable } from "./users";

type StripeIdentityData = {
    verificationSession: Stripe.Identity.VerificationSession;
    ephemeralKey: Stripe.EphemeralKey;
};
type ProviderData = StripeIdentityData;

export const hostVerificationProviderEnum = pgEnum(
    "host_verification_provider",
    ["stripe_identity"]
);

export const hostVerificationStatusEnum = pgEnum("host_verification_status", [
    "pending",
    "approved",
    "rejected",
]);

export const hostVerificationsTable = pgTable("host_verifications", {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
        .references(() => usersTable.id)
        .notNull()
        .unique(),

    provider:
        hostVerificationProviderEnum("provider").default("stripe_identity"),
    providerData: jsonb("provider_data").$type<ProviderData>(),

    status: hostVerificationStatusEnum("status").default("pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
