import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

import { usersTable } from "./users";

export const hostsTable = pgTable("hosts", {
    id: uuid("id")
        .primaryKey()
        .references(() => usersTable.id)
        .notNull()
        .unique(),
    bio: text("bio").notNull(),
    languages: text("languages").array(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
