import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const verificationCodesTable = pgTable("verification_codes", {
    phoneNumber: text("phone_number").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
