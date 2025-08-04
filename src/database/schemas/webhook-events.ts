import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    integer,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

export const webhookEventsTable = pgTable("webhook_events", {
    id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
    
    // Stripe event details
    stripeEventId: text("stripe_event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    
    // Processing details
    processedAt: timestamp("processed_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    processingDurationMs: integer("processing_duration_ms"),
    
    // Event data (for debugging/auditing)
    eventData: jsonb("event_data"),
    
    // Error tracking
    errorMessage: text("error_message"),
    errorCode: text("error_code"),
    retryCount: integer("retry_count").default(0),
    
    // Metadata
    webhookEndpoint: text("webhook_endpoint"), // 'payment' or 'identity'
    apiVersion: text("api_version"),
    
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex("idx_webhook_events_stripe_id").on(table.stripeEventId),
    index("idx_webhook_events_type").on(table.eventType),
    index("idx_webhook_events_processed").on(table.processedAt),
]);