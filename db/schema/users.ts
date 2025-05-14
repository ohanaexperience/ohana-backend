import { pgTable, pgEnum, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const userAuthProviderEnum = pgEnum("user_auth_provider", [
    "google",
    "apple",
    "email",
]);

export const usersTable = pgTable("users", {
    id: uuid("id").primaryKey(),
    authProvider: userAuthProviderEnum("auth_provider")
        .notNull()
        .default("email"),
    email: text("email").unique(),
    phoneNumber: text("phone_number").unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    bio: text("bio"),
    profileImageUrl: text("profile_image_url").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
