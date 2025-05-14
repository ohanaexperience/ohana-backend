import {
    pgTable,
    pgEnum,
    serial,
    uuid,
    text,
    integer,
    timestamp,
} from "drizzle-orm/pg-core";

import { hostsTable } from "./hosts";

export const experienceStatusEnum = pgEnum("experience_status", [
    "draft",
    "published",
    "archived",
]);

export const experiencesTable = pgTable("experiences", {
    id: serial("id").primaryKey(),
    hostId: uuid("host_id")
        .references(() => hostsTable.id)
        .notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    duration: integer("duration").notNull(),
    maxGuests: integer("max_guests").notNull(),
    status: experienceStatusEnum("status").default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
