import {
    pgTable,
    pgEnum,
    uuid,
    serial,
    timestamp,
    text,
    jsonb,
} from "drizzle-orm/pg-core";

import { usersTable } from "./users";
import {
    HOST_VERIFICATION_PROVIDERS,
    HOST_VERIFICATION_STATUSES,
} from "@/constants/hostVerifications";
import { ProviderData } from "@/types/hostVerifications";

// Enums
export const hostVerificationProviderEnum = pgEnum(
    "host_verification_provider",
    HOST_VERIFICATION_PROVIDERS
);
export const hostVerificationStatusEnum = pgEnum(
    "host_verification_status",
    HOST_VERIFICATION_STATUSES
);

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
