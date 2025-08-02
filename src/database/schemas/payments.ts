import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { reservationsTable } from "./reservations";

export const paymentsTable = pgTable("payments", {
    id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
    
    // Reservation reference
    reservationId: uuid("reservation_id")
        .references(() => reservationsTable.id)
        .notNull(),
    
    // Stripe references
    paymentIntentId: text("payment_intent_id").unique().notNull(),
    chargeId: text("charge_id"),
    
    // Amount tracking
    amount: integer("amount").notNull(), // in cents
    currency: text("currency").notNull().default('usd'),
    applicationFeeAmount: integer("application_fee_amount"), // For marketplace fees
    
    // Status tracking
    status: text("status").notNull(), // 'pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    
    // Refund tracking
    refundedAmount: integer("refunded_amount").default(0),
    refundReason: text("refund_reason"),
    lastRefundId: text("last_refund_id"),
    
    // Customer info
    stripeCustomerId: text("stripe_customer_id"),
    paymentMethodId: text("payment_method_id"),
    paymentMethodType: text("payment_method_type"), // 'card', 'apple_pay', etc.
    
    // Card details (for display only)
    last4: text("last4"),
    brand: text("brand"),
    
    // Error tracking
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    
    // Idempotency
    idempotencyKey: text("idempotency_key").unique(),
    
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("idx_payments_reservation").on(table.reservationId),
    index("idx_payments_status").on(table.status),
    index("idx_payments_payment_intent").on(table.paymentIntentId),
]);