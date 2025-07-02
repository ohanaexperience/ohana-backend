import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

import { usersTable } from "./users";

export const hostsTable = pgTable("hosts", {
    id: uuid("id")
        .primaryKey()
        .references(() => usersTable.id)
        .notNull()
        .unique(),
    bio: text("bio"),
    languages: text("languages").array().default([]).notNull(),
    socials: text("socials").array().default([]).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
