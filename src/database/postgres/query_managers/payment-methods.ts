import { eq, and, desc } from "drizzle-orm";
import { BaseQueryManager } from "./base";
import { paymentMethodsTable } from "@/database/schemas";

export class PaymentMethodsQueryManager extends BaseQueryManager {
    async create(data: {
        userId: string;
        stripePaymentMethodId: string;
        stripeCustomerId: string;
        type: string;
        last4?: string;
        brand?: string;
        expMonth?: string;
        expYear?: string;
        holderName?: string;
        nickname?: string;
        isDefault?: boolean;
    }) {
        return await this.withDatabase(async (db) => {
            // If this is the first payment method or marked as default, update other methods
            if (data.isDefault) {
                await db
                    .update(paymentMethodsTable)
                    .set({ isDefault: false })
                    .where(eq(paymentMethodsTable.userId, data.userId));
            }

            const [paymentMethod] = await db
                .insert(paymentMethodsTable)
                .values(data)
                .returning();

            return paymentMethod;
        });
    }

    async getByUserId(userId: string) {
        return await this.withDatabase(async (db) => {
            return await db
                .select()
                .from(paymentMethodsTable)
                .where(
                    and(
                        eq(paymentMethodsTable.userId, userId),
                        eq(paymentMethodsTable.status, 'active')
                    )
                )
                .orderBy(
                    desc(paymentMethodsTable.isDefault),
                    desc(paymentMethodsTable.createdAt)
                );
        });
    }

    async getById(id: string) {
        return await this.withDatabase(async (db) => {
            const [paymentMethod] = await db
                .select()
                .from(paymentMethodsTable)
                .where(eq(paymentMethodsTable.id, id));

            return paymentMethod || null;
        });
    }

    async getByStripePaymentMethodId(stripePaymentMethodId: string) {
        return await this.withDatabase(async (db) => {
            const [paymentMethod] = await db
                .select()
                .from(paymentMethodsTable)
                .where(eq(paymentMethodsTable.stripePaymentMethodId, stripePaymentMethodId));

            return paymentMethod || null;
        });
    }

    async getDefaultForUser(userId: string) {
        return await this.withDatabase(async (db) => {
            const [paymentMethod] = await db
                .select()
                .from(paymentMethodsTable)
                .where(
                    and(
                        eq(paymentMethodsTable.userId, userId),
                        eq(paymentMethodsTable.isDefault, true),
                        eq(paymentMethodsTable.status, 'active')
                    )
                );

            return paymentMethod || null;
        });
    }

    async setAsDefault(id: string, userId: string) {
        return await this.withDatabase(async (db) => {
            // Start transaction to ensure atomicity
            await db.transaction(async (tx) => {
                // Remove default from all other payment methods
                await tx
                    .update(paymentMethodsTable)
                    .set({ isDefault: false })
                    .where(eq(paymentMethodsTable.userId, userId));

                // Set this one as default
                await tx
                    .update(paymentMethodsTable)
                    .set({ 
                        isDefault: true,
                        updatedAt: new Date()
                    })
                    .where(
                        and(
                            eq(paymentMethodsTable.id, id),
                            eq(paymentMethodsTable.userId, userId)
                        )
                    );
            });

            return await this.getById(id);
        });
    }

    async update(id: string, userId: string, data: {
        nickname?: string;
        isDefault?: boolean;
    }) {
        return await this.withDatabase(async (db) => {
            if (data.isDefault) {
                // Handle default flag update in transaction
                return await this.setAsDefault(id, userId);
            }

            const [updated] = await db
                .update(paymentMethodsTable)
                .set({
                    ...data,
                    updatedAt: new Date()
                })
                .where(
                    and(
                        eq(paymentMethodsTable.id, id),
                        eq(paymentMethodsTable.userId, userId)
                    )
                )
                .returning();

            return updated;
        });
    }

    async delete(id: string, userId: string) {
        return await this.withDatabase(async (db) => {
            // Soft delete by updating status
            const [deleted] = await db
                .update(paymentMethodsTable)
                .set({
                    status: 'deleted',
                    isDefault: false,
                    updatedAt: new Date()
                })
                .where(
                    and(
                        eq(paymentMethodsTable.id, id),
                        eq(paymentMethodsTable.userId, userId)
                    )
                )
                .returning();

            // If this was the default, make the next most recent one default
            if (deleted?.isDefault) {
                const remaining = await this.getByUserId(userId);
                if (remaining.length > 0) {
                    await this.setAsDefault(remaining[0].id, userId);
                }
            }

            return deleted;
        });
    }

    async updateStripeDetails(stripePaymentMethodId: string, details: {
        last4?: string;
        brand?: string;
        expMonth?: string;
        expYear?: string;
        status?: string;
    }) {
        return await this.withDatabase(async (db) => {
            const [updated] = await db
                .update(paymentMethodsTable)
                .set({
                    ...details,
                    updatedAt: new Date()
                })
                .where(eq(paymentMethodsTable.stripePaymentMethodId, stripePaymentMethodId))
                .returning();

            return updated;
        });
    }
}

export const paymentMethodsQueryManager = new PaymentMethodsQueryManager(
    () => { throw new Error("PaymentMethodsQueryManager not initialized with database instance") },
    async () => { throw new Error("PaymentMethodsQueryManager not initialized with database instance") }
);