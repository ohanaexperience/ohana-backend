import { pgTable, uuid, text, integer, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./users";
import { hostsTable } from "./hosts";
import { experiencesTable } from "./experiences";
import { reservationsTable } from "./reservations";

export const reviewsTable = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").notNull().unique().references(() => reservationsTable.id),
  experienceId: uuid("experience_id").notNull().references(() => experiencesTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  hostId: uuid("host_id").notNull().references(() => hostsTable.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  hostResponse: text("host_response"),
  hostResponseAt: timestamp("host_response_at"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  index("reviews_experience_id_idx").on(table.experienceId),
  index("reviews_user_id_idx").on(table.userId),
  index("reviews_host_id_idx").on(table.hostId),
  index("reviews_created_at_idx").on(table.createdAt),
  index("reviews_rating_idx").on(table.rating),
  index("reviews_is_published_idx").on(table.isPublished)
]);

export const reviewImagesTable = pgTable("review_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id").notNull().references(() => reviewsTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  index("review_images_review_id_idx").on(table.reviewId)
]);

export const reviewHelpfulVotesTable = pgTable("review_helpful_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id").notNull().references(() => reviewsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  unique("review_user_unique").on(table.reviewId, table.userId),
  index("review_helpful_votes_review_id_idx").on(table.reviewId)
]);

// Relations
export const reviewsRelations = relations(reviewsTable, ({ one, many }) => ({
  reservation: one(reservationsTable, {
    fields: [reviewsTable.reservationId],
    references: [reservationsTable.id]
  }),
  experience: one(experiencesTable, {
    fields: [reviewsTable.experienceId],
    references: [experiencesTable.id]
  }),
  user: one(usersTable, {
    fields: [reviewsTable.userId],
    references: [usersTable.id]
  }),
  host: one(hostsTable, {
    fields: [reviewsTable.hostId],
    references: [hostsTable.id]
  }),
  images: many(reviewImagesTable),
  helpfulVotes: many(reviewHelpfulVotesTable)
}));

export const reviewImagesRelations = relations(reviewImagesTable, ({ one }) => ({
  review: one(reviewsTable, {
    fields: [reviewImagesTable.reviewId],
    references: [reviewsTable.id]
  })
}));

export const reviewHelpfulVotesRelations = relations(reviewHelpfulVotesTable, ({ one }) => ({
  review: one(reviewsTable, {
    fields: [reviewHelpfulVotesTable.reviewId],
    references: [reviewsTable.id]
  }),
  user: one(usersTable, {
    fields: [reviewHelpfulVotesTable.userId],
    references: [usersTable.id]
  })
}));