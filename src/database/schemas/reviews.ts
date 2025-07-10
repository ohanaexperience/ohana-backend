import {
    pgTable,
    pgEnum,
    uuid,
    text,
    integer,
    timestamp,
    boolean,
    index,
    unique,
} from "drizzle-orm/pg-core";

import { experiencesTable } from "./experiences";
import { usersTable } from "./users";
import { reservationsTable } from "./reservations";

// Review status enum
export const reviewStatusEnum = pgEnum("review_status", [
    "active",
    "flagged",
    "removed",
]);

// Main reviews table
export const reviewsTable = pgTable(
    "reviews",
    {
        id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
        
        // Foreign key relationships
        userId: uuid("user_id")
            .references(() => usersTable.id)
            .notNull(),
        experienceId: uuid("experience_id")
            .references(() => experiencesTable.id, { onDelete: "cascade" })
            .notNull(),
        reservationId: uuid("reservation_id")
            .references(() => reservationsTable.id)
            .notNull(),

        // Review content
        rating: integer("rating").notNull(), // 1-5 scale
        title: text("title").notNull(),
        comment: text("comment").notNull(),
        
        // Review categories (1-5 scale each)
        valueForMoney: integer("value_for_money"),
        communication: integer("communication"),
        accuracy: integer("accuracy"),
        location: integer("location"),
        checkin: integer("checkin"),
        cleanliness: integer("cleanliness"),
        
        // Moderation and status
        status: reviewStatusEnum("status").default("active"),
        flaggedReason: text("flagged_reason"),
        moderatedAt: timestamp("moderated_at", { withTimezone: true }),
        moderatedBy: uuid("moderated_by"), // Could reference admin user
        
        // Host response
        hostResponse: text("host_response"),
        hostResponseAt: timestamp("host_response_at", { withTimezone: true }),
        
        // Helpful votes from other users
        helpfulVotes: integer("helpful_votes").default(0),
        
        // Timestamps
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        // Ensure one review per reservation
        unique("unique_reservation_review").on(table.reservationId),
        
        // Indexes for performance
        index("idx_reviews_experience_id").on(table.experienceId),
        index("idx_reviews_user_id").on(table.userId),
        index("idx_reviews_rating").on(table.rating),
        index("idx_reviews_status").on(table.status),
        index("idx_reviews_created_at").on(table.createdAt),
    ]
);

// Table for tracking helpful votes on reviews
export const reviewHelpfulVotesTable = pgTable(
    "review_helpful_votes",
    {
        id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
        
        reviewId: uuid("review_id")
            .references(() => reviewsTable.id, { onDelete: "cascade" })
            .notNull(),
        userId: uuid("user_id")
            .references(() => usersTable.id)
            .notNull(),
        
        isHelpful: boolean("is_helpful").notNull(), // true = helpful, false = not helpful
        
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        // Ensure one vote per user per review
        unique("unique_user_review_vote").on(table.userId, table.reviewId),
        
        // Indexes
        index("idx_helpful_votes_review_id").on(table.reviewId),
        index("idx_helpful_votes_user_id").on(table.userId),
    ]
);

// Table for storing aggregated review statistics for experiences
export const experienceReviewStatsTable = pgTable(
    "experience_review_stats",
    {
        id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
        
        experienceId: uuid("experience_id")
            .references(() => experiencesTable.id, { onDelete: "cascade" })
            .notNull()
            .unique(),
        
        // Overall statistics
        totalReviews: integer("total_reviews").default(0),
        averageRating: integer("average_rating").default(0), // Stored as integer (rating * 100) for precision
        
        // Rating distribution
        fiveStarCount: integer("five_star_count").default(0),
        fourStarCount: integer("four_star_count").default(0),
        threeStarCount: integer("three_star_count").default(0),
        twoStarCount: integer("two_star_count").default(0),
        oneStarCount: integer("one_star_count").default(0),
        
        // Category averages (stored as integer * 100 for precision)
        avgValueForMoney: integer("avg_value_for_money").default(0),
        avgCommunication: integer("avg_communication").default(0),
        avgAccuracy: integer("avg_accuracy").default(0),
        avgLocation: integer("avg_location").default(0),
        avgCheckin: integer("avg_checkin").default(0),
        avgCleanliness: integer("avg_cleanliness").default(0),
        
        // Timestamps
        lastUpdated: timestamp("last_updated", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_review_stats_experience_id").on(table.experienceId),
        index("idx_review_stats_average_rating").on(table.averageRating),
        index("idx_review_stats_total_reviews").on(table.totalReviews),
    ]
);