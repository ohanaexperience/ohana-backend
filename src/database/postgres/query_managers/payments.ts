import { eq, and, InferInsertModel } from "drizzle-orm";
import { BaseQueryManager } from "./base";
import { paymentsTable } from "@/database/schemas";

export class PaymentsQueryManager extends BaseQueryManager {
    
    public async create(data: InsertPayment) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .insert(paymentsTable)
                .values(data)
                .returning();
            
            return results[0];
        });
    }
    
    public async getById(paymentId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(paymentsTable)
                .where(eq(paymentsTable.id, paymentId))
                .limit(1);
            
            return results[0] || null;
        });
    }
    
    public async getByPaymentIntentId(paymentIntentId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(paymentsTable)
                .where(eq(paymentsTable.paymentIntentId, paymentIntentId))
                .limit(1);
            
            return results[0] || null;
        });
    }
    
    public async getByReservationId(reservationId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(paymentsTable)
                .where(eq(paymentsTable.reservationId, reservationId))
                .limit(1);
            
            return results[0] || null;
        });
    }
    
    public async getByIdempotencyKey(idempotencyKey: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(paymentsTable)
                .where(eq(paymentsTable.idempotencyKey, idempotencyKey))
                .limit(1);
            
            return results[0] || null;
        });
    }
    
    public async updateStatus(paymentId: string, updates: {
        status: string;
        chargeId?: string;
        capturedAt?: Date;
        lastErrorCode?: string;
        lastErrorMessage?: string;
        last4?: string;
        brand?: string;
        paymentMethodType?: string;
    }) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .update(paymentsTable)
                .set({
                    ...updates,
                    updatedAt: new Date(),
                })
                .where(eq(paymentsTable.id, paymentId))
                .returning();
            
            return results[0] || null;
        });
    }
    
    public async recordRefund(paymentId: string, refundAmount: number, refundId: string, reason?: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .update(paymentsTable)
                .set({
                    refundedAmount: refundAmount,
                    lastRefundId: refundId,
                    refundReason: reason,
                    status: refundAmount === 0 ? 'refunded' : 'partially_refunded',
                    updatedAt: new Date(),
                })
                .where(eq(paymentsTable.id, paymentId))
                .returning();
            
            return results[0] || null;
        });
    }
}

// Types
export type InsertPayment = InferInsertModel<typeof paymentsTable>;
export type UpdatePayment = Partial<Omit<InsertPayment, "id">>;