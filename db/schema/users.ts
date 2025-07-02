import { pgTable, pgEnum, uuid, text, timestamp } from "drizzle-orm/pg-core";

import { USER_AUTH_PROVIDERS } from "../../src/constants/users";

// Enums
export const userAuthProviderEnum = pgEnum(
    "user_auth_provider",
    USER_AUTH_PROVIDERS
);

export const usersTable = pgTable("users", {
    id: uuid("id").primaryKey(),
    authProvider: userAuthProviderEnum("auth_provider")
        .notNull()
        .default("email"),
    email: text("email").unique(),
    phoneNumber: text("phone_number").unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    profileImageUrl: text("profile_image_url").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
