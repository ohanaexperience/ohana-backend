import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    index,
} from "drizzle-orm/pg-core";
import { reservationsTable } from "./reservations";

export const reservationEventsTable = pgTable("reservation_events", {
    id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
    
    // Reference to reservation
    reservationId: uuid("reservation_id")
        .references(() => reservationsTable.id)
        .notNull(),
    
    // Event details
    eventType: text("event_type").notNull(), // 'created', 'payment_initiated', 'payment_captured', 'confirmed', 'cancelled', 'refunded'
    eventData: jsonb("event_data").notNull(), // Store event-specific data
    
    // Actor information
    userId: text("user_id"), // Who triggered this event
    source: text("source").notNull(), // 'api', 'webhook', 'admin', 'system'
    
    // Metadata
    metadata: jsonb("metadata"), // Additional context (IP, user agent, etc.)
    
    // Timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    // Index for querying events by reservation
    index("idx_reservation_events_reservation").on(table.reservationId),
    // Index for querying by event type
    index("idx_reservation_events_type").on(table.eventType),
    // Index for chronological queries
    index("idx_reservation_events_created").on(table.createdAt),
]);