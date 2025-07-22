import {
    pgTable,
    serial,
    uuid,
    text,
    timestamp,
    boolean,
    integer,
    jsonb,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

import { experiencesTable } from "./experiences";

// Collections table - manages different curated lists
export const experienceCollectionsTable = pgTable("experience_collections", {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(), // Extensible - any string can be used
    isActive: boolean("is_active").default(true),
    isPublic: boolean("is_public").default(true),
    
    // Metadata for dynamic collections
    metadata: jsonb("metadata").$type<{
        // For location-based collections
        requiresLocation?: boolean;
        maxDistanceKm?: number;
        
        // For algorithmic collections
        algorithm?: "popularity" | "rating" | "recency" | "personalized";
        
        // Display settings
        displayLimit?: number;
        refreshIntervalHours?: number;
        
        // Custom rules
        filters?: Record<string, any>;
    }>(),
    
    sortOrder: integer("sort_order").default(0),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
    index("idx_collections_type").on(table.type),
    index("idx_collections_active").on(table.isActive),
]);

// Junction table for experiences in collections
export const experienceCollectionItemsTable = pgTable("experience_collection_items", {
    id: serial("id").primaryKey(),
    collectionId: integer("collection_id")
        .references(() => experienceCollectionsTable.id, { onDelete: "cascade" })
        .notNull(),
    experienceId: uuid("experience_id")
        .references(() => experiencesTable.id, { onDelete: "cascade" })
        .notNull(),
    
    // Position in the collection (for manual ordering)
    position: integer("position").default(0),
    
    // Optional scoring for algorithmic collections
    score: integer("score"),
    
    // When this experience was added to the collection
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
    
    // Optional expiry for temporary collections
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
    uniqueIndex("idx_collection_experience_unique").on(table.collectionId, table.experienceId),
    index("idx_collection_items_position").on(table.collectionId, table.position),
    index("idx_collection_items_expires").on(table.expiresAt),
]);