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
} from "drizzle-orm/pg-core";

import { hostsTable } from "./hosts";
import {
    EXPERIENCE_STATUS,
    EXPERIENCE_TYPE,
    EXPERIENCE_INCLUDED_ITEMS,
    EXPERIENCE_PHYSICAL_REQUIREMENTS,
    EXPERIENCE_DURATION,
    EXPERIENCE_CANCELLATION_POLICY,
} from "../../src/constants/experiences";
import {
    ExperienceCategory,
    ExperienceGroupSize,
    ExperienceAgeRecommendation,
    ExperienceGroupDiscount,
    ExperienceAvailability,
    ExperienceEarlyBirdRate,
    ExperienceMeetingLocation,
} from "../../src/types/experiences";

// Enums
export const experienceStatusEnum = pgEnum(
    "experience_status",
    EXPERIENCE_STATUS
);
export const experienceTypeEnum = pgEnum("experience_type", EXPERIENCE_TYPE);
export const includedItemsEnum = pgEnum(
    "experience_included_items",
    EXPERIENCE_INCLUDED_ITEMS
);
export const physicalRequirementsEnum = pgEnum(
    "experience_physical_requirements",
    EXPERIENCE_PHYSICAL_REQUIREMENTS
);
export const experienceDurationEnum = pgEnum(
    "experience_duration",
    EXPERIENCE_DURATION
);

export const cancellationPolicyEnum = pgEnum(
    "experience_cancellation_policy",
    EXPERIENCE_CANCELLATION_POLICY
);

export const experiencesTable = pgTable("experiences", {
    id: serial("id").primaryKey(),
    hostId: uuid("host_id")
        .references(() => hostsTable.id)
        .notNull(),

    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    category: jsonb("category").$type<ExperienceCategory>().notNull(),
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
    groupDiscounts: jsonb("group_discounts")
        .$type<ExperienceGroupDiscount>()
        .default({
            enabled: false,
            discountPercentageFor3Plus: null,
            discountPercentageFor5Plus: null,
        }),
    earlyBirdRate: jsonb("early_bird_rate")
        .$type<ExperienceEarlyBirdRate>()
        .default({
            enabled: false,
            discountPercentage: null,
            daysInAdvance: null,
        }),
    cancellationPolicy: cancellationPolicyEnum("cancellation_policy").notNull(),
    groupSize: jsonb("group_size").$type<ExperienceGroupSize>(),

    coverImageUrl: text("cover_image_url").notNull(),
    galleryImageUrls: text("gallery_image_urls").array().default([]).notNull(),

    includedItems: includedItemsEnum("included_items")
        .array()
        .default([])
        .notNull(),
    whatToBring: text("what_to_bring").notNull(),
    physicalRequirements: physicalRequirementsEnum(
        "physical_requirements"
    ).notNull(),
    ageRecommendations: jsonb(
        "age_recommendations"
    ).$type<ExperienceAgeRecommendation>(),

    experienceDuration: experienceDurationEnum("experience_duration").notNull(),
    availability: jsonb("availability").$type<ExperienceAvailability>(),

    status: experienceStatusEnum("status").default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
