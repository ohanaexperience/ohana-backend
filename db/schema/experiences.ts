import {
    pgTable,
    pgEnum,
    serial,
    uuid,
    text,
    integer,
    timestamp,
    point,
    jsonb,
    boolean,
    index,
} from "drizzle-orm/pg-core";

import { hostsTable } from "./hosts";
import { categoriesTable, subCategoriesTable } from "./categories";
import {
    EXPERIENCE_STATUS,
    EXPERIENCE_TYPE,
    EXPERIENCE_INCLUDED_ITEMS,
    EXPERIENCE_PHYSICAL_REQUIREMENTS,
    EXPERIENCE_CANCELLATION_POLICY,
    EXPERIENCE_AGE_RECOMMENDATIONS,
} from "@/constants/experiences";
import { ExperienceMeetingLocation } from "@/types/experiences";

// Enums
export const experienceStatusEnum = pgEnum(
    "experience_status",
    EXPERIENCE_STATUS as [string, ...string[]]
);
export const experienceTypeEnum = pgEnum(
    "experience_type",
    EXPERIENCE_TYPE as [string, ...string[]]
);
export const includedItemsEnum = pgEnum(
    "experience_included_items",
    EXPERIENCE_INCLUDED_ITEMS as [string, ...string[]]
);
export const physicalRequirementsEnum = pgEnum(
    "experience_physical_requirements",
    EXPERIENCE_PHYSICAL_REQUIREMENTS as [string, ...string[]]
);
export const cancellationPolicyEnum = pgEnum(
    "experience_cancellation_policy",
    EXPERIENCE_CANCELLATION_POLICY as [string, ...string[]]
);
export const ageRangeEnum = pgEnum(
    "age_range",
    EXPERIENCE_AGE_RECOMMENDATIONS as [string, ...string[]]
);

export const experiencesTable = pgTable("experiences", {
    id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
    hostId: uuid("host_id")
        .references(() => hostsTable.id)
        .notNull(),

    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    categoryId: integer("category_id")
        .references(() => categoriesTable.id)
        .notNull(),
    subCategoryId: integer("sub_category_id")
        .references(() => subCategoriesTable.id)
        .notNull(),
    languages: text("languages").array().default([]).notNull(),
    experienceType: experienceTypeEnum("experience_type").notNull(),
    description: text("description").notNull(),

    startingLocationAddress: text("starting_location_address").notNull(),
    startingLocation: point("starting_location", { mode: "tuple" }).notNull(),
    endingLocationAddress: text("ending_location_address").notNull(),
    endingLocation: point("ending_location", { mode: "tuple" }).notNull(),
    meetingLocation:
        jsonb("meeting_location").$type<ExperienceMeetingLocation>(),

    pricePerPerson: integer("price_per_person").notNull(),

    groupDiscountsEnabled: boolean("group_discounts_enabled").default(false),
    discountPercentageFor3Plus: integer("discount_percentage_for_3_plus"),
    discountPercentageFor5Plus: integer("discount_percentage_for_5_plus"),

    earlyBirdEnabled: boolean("early_bird_enabled").default(false),
    earlyBirdDiscountPercentage: integer("early_bird_discount_percentage"),
    earlyBirdDaysInAdvance: integer("early_bird_days_in_advance"),

    cancellationPolicy: cancellationPolicyEnum("cancellation_policy").notNull(),

    minGuests: integer("min_guests").notNull(),
    maxGuests: integer("max_guests").notNull(),
    autoCancelEnabled: boolean("auto_cancel_enabled").default(false),
    autoCancelHours: integer("auto_cancel_hours"),

    coverImageUrl: text("cover_image_url"),
    galleryImageUrls: text("gallery_image_urls").array().default([]),

    includedItems: includedItemsEnum("included_items")
        .array()
        .default([])
        .notNull(),
    whatToBring: text("what_to_bring"),
    physicalRequirements: physicalRequirementsEnum(
        "physical_requirements"
    ).notNull(),

    ageRange: ageRangeEnum("age_range").notNull(),
    accessibilityInfo: text("accessibility_info"),

    durationHours: integer("duration_hours").notNull(),
    timezone: text("timezone").notNull(),

    status: experienceStatusEnum("status").default("draft"),
    isPublic: boolean("is_public").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const experienceAvailabilityTable = pgTable("experience_availability", {
    id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
    experienceId: uuid("experience_id")
        .references(() => experiencesTable.id, { onDelete: "cascade" })
        .notNull(),

    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }),
    daysOfWeek: integer("days_of_week").array().notNull(),
    timeSlots: text("time_slots").array().notNull(),
    maxCapacity: integer("max_capacity").default(1),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const experienceTimeSlotsTable = pgTable(
    "experience_time_slots",
    {
        id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
        experienceId: uuid("experience_id")
            .references(() => experiencesTable.id, { onDelete: "cascade" })
            .notNull(),
        availabilityId: uuid("availability_id")
            .references(() => experienceAvailabilityTable.id)
            .notNull(),

        slotDateTime: timestamp("slot_datetime", {
            withTimezone: true,
        }).notNull(),
        localDate: timestamp("local_date", { mode: "date" }).notNull(),
        localTime: text("local_time").notNull(),
        maxCapacity: integer("max_capacity").notNull(),
        bookedCount: integer("booked_count").notNull().default(0),
        status: text("status").default("available"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    },
    (table) => [
        index("idx_time_slots_experience_datetime").on(
            table.experienceId,
            table.slotDateTime
        ),
        index("idx_time_slots_local_date").on(table.localDate),
        index("idx_time_slots_status").on(table.status),
    ]
);
