import { eq, InferInsertModel, and, lt } from "drizzle-orm";

import { BaseQueryManager } from "./base";
import { reservationsTable } from "@/database/schemas";

export class ReservationsQueryManager extends BaseQueryManager {

    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(reservationsTable)
        );
    }

    public async getByUserId(userId: string) {
        return await this.withDatabase(async (db) =>
            db.select()
                .from(reservationsTable)
                .where(eq(reservationsTable.userId, userId))
        );
    }

    public async getById(reservationId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(reservationsTable)
                .where(eq(reservationsTable.id, reservationId))
                .limit(1);

            return results[0] || null;
        });
    }

    public async getByReference(reference: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(reservationsTable)
                .where(eq(reservationsTable.reservationReference, reference))
                .limit(1);

            return results[0] || null;
        });
    }

    public async getByIdempotencyKey(idempotencyKey: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(reservationsTable)
                .where(eq(reservationsTable.idempotencyKey, idempotencyKey))
                .limit(1);

            return results[0] || null;
        });
    }

    public async create(data: InsertReservation) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .insert(reservationsTable)
                .values(data)
                .returning();

            return results[0] || null;
        });
    }

    public async update(reservationId: string, data: UpdateReservation) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .update(reservationsTable)
                .set(data)
                .where(eq(reservationsTable.id, reservationId))
                .returning();

            return results[0] || null;
        });
    }

    public async updateByPaymentIntent(
        paymentIntentId: string,
        data: UpdateReservation
    ) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .update(reservationsTable)
                .set(data)
                .where(eq(reservationsTable.paymentIntentId, paymentIntentId))
                .returning();

            return results[0] || null;
        });
    }

    public async getExpiredHolds() {
        return await this.withDatabase(async (db) => {
            return await db
                .select()
                .from(reservationsTable)
                .where(
                    and(
                        eq(reservationsTable.status, 'held'),
                        lt(reservationsTable.holdExpiresAt, new Date())
                    )
                );
        });
    }
}

export type InsertReservation = InferInsertModel<typeof reservationsTable>;
export type UpdateReservation = Partial<Omit<InsertReservation, "id">>;
