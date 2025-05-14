import {
    pgTable,
    pgEnum,
    uuid,
    serial,
    timestamp,
    text,
} from "drizzle-orm/pg-core";

import { usersTable } from "./users";

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
    providerVerificationId: text("provider_verification_id"),
    sessionClientSecret: text("session_client_secret").notNull(),
    status: hostVerificationStatusEnum("status").default("pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// export const hostVerificationsTable = pgTable(
//     "host_verifications",
//     {
//         id: serial("id").primaryKey(),
//         userId: uuid("user_id")
//             .references(() => usersTable.id)
//             .notNull()
//             .unique(),
//         provider: providerEnum("provider").default("stripe_identity"),
//         providerVerificationId: text("provider_verification_id"),
//         status: verificationStatusEnum("status").default("pending"),
//         submittedAt: timestamp("submitted_at", { withTimezone: true }),
//         approvedAt: timestamp("approved_at", { withTimezone: true }),
//         createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
//         updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
//     },
//     (table) => [
//         index("provider_verification_id_idx").on(table.providerVerificationId),
//     ]
// );
