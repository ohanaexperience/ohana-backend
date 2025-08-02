import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { experiencesTable, experienceTimeSlotsTable } from "./experiences";
import { usersTable } from "./users";

export const reservationStatusEnum = pgEnum("reservation_status", [
    "held",
    "pending",
    "confirmed",
    "cancelled",
    "completed",
    "refunded",
]);

export const reservationsTable = pgTable("reservations", {
    id: uuid("id").primaryKey().notNull().unique().defaultRandom(),

    // References
    userId: uuid("user_id")
        .references(() => usersTable.id)
        .notNull(),
    experienceId: uuid("experience_id")
        .references(() => experiencesTable.id)
        .notNull(),
    timeSlotId: uuid("time_slot_id")
        .references(() => experienceTimeSlotsTable.id)
        .notNull(),

    // Reservation details
    numberOfGuests: integer("number_of_guests").notNull(),
    totalPrice: integer("total_price").notNull(),
    originalPrice: integer("original_price").notNull(),
    discountApplied: integer("discount_applied").default(0),
    discountType: text("discount_type"),

    // Status and metadata
    status: reservationStatusEnum("status").default("confirmed"),
    reservationReference: text("reservation_reference").notNull().unique(),

    // Contact info (in case user profile changes)
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone"),

    // Special requirements/notes
    specialRequests: text("special_requests"),

    // Payment info
    paymentIntentId: text("payment_intent_id"), // Stripe payment intent
    paymentStatus: text("payment_status").default("pending"),

    // Idempotency
    idempotencyKey: text("idempotency_key").unique(),

    // Hold management
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),

    // Cancellation
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    refundAmount: integer("refund_amount"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
