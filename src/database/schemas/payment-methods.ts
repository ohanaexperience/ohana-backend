import {
    pgTable,
    uuid,
    text,
    timestamp,
    boolean,
    index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const paymentMethodsTable = pgTable("payment_methods", {
    id: uuid("id").primaryKey().notNull().unique().defaultRandom(),
    
    // User reference
    userId: uuid("user_id")
        .references(() => usersTable.id)
        .notNull(),
    
    // Stripe references
    stripePaymentMethodId: text("stripe_payment_method_id").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    
    // Payment method details (for display only)
    type: text("type").notNull(), // 'card', 'apple_pay', 'google_pay', etc.
    last4: text("last4"), // Last 4 digits of card
    brand: text("brand"), // 'visa', 'mastercard', etc.
    expMonth: text("exp_month"), // MM
    expYear: text("exp_year"), // YYYY
    holderName: text("holder_name"), // Cardholder name
    
    // Metadata
    isDefault: boolean("is_default").default(false),
    nickname: text("nickname"), // User-defined name like "Personal Visa"
    
    // Status
    status: text("status").default('active'), // 'active', 'expired', 'deleted'
    
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("idx_payment_methods_user").on(table.userId),
    index("idx_payment_methods_stripe_pm").on(table.stripePaymentMethodId),
    index("idx_payment_methods_default").on(table.userId, table.isDefault),
]);