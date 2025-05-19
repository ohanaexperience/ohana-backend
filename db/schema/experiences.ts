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

export const experienceCategoriesEnum = pgEnum("experience_categories", [
    "food",
    "drink",
    "activity",
    "tour",
]);

export const experienceTypeEnum = pgEnum("experience_type", [
    "indoor",
    "outdoor",
    "both",
]);

export const experiencesTable = pgTable("experiences", {
    id: serial("id").primaryKey(),
    hostId: uuid("host_id")
        .references(() => hostsTable.id)
        .notNull(),

    title: text("title").notNull(),
    tagLine: text("tag_line").notNull(),
    category: experienceCategoriesEnum("category").notNull(),
    languages: text("languages").array().default([]).notNull(),
    experienceType: experienceTypeEnum("experience_type").notNull(),
    description: text("description").notNull(),

    // startingLocationAddress: text("starting_location_address").notNull(),
    // startingLocationLatitude: doublePrecision("starting_location_latitude").notNull(),
    // startingLocationLongitude: doublePrecision("starting_location_longitude").notNull(),

    price: integer("price").notNull(),
    duration: integer("duration").notNull(),
    maxGuests: integer("max_guests").notNull(),
    status: experienceStatusEnum("status").default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
