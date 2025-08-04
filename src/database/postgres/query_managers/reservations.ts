import { eq, InferInsertModel, and, lt, desc, count } from "drizzle-orm";

import { BaseQueryManager } from "./base";
import { reservationsTable, experiencesTable, experienceTimeSlotsTable, usersTable } from "@/database/schemas";

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

    public async getByUserIdWithDetails(userId: string, filters?: {
        status?: string;
        limit?: number;
        offset?: number;
    }) {
        return await this.withDatabase(async (db) => {
            // Build where conditions
            const whereConditions = [eq(reservationsTable.userId, userId)];
            if (filters?.status) {
                whereConditions.push(eq(reservationsTable.status, filters.status as any));
            }
            
            // Apply limit and offset at the database level
            const limit = filters?.limit || 20;
            const offset = filters?.offset || 0;
            
            // Execute optimized query with joins
            const results = await db
                .select({
                    reservation: reservationsTable,
                    experience: experiencesTable,
                    timeSlot: experienceTimeSlotsTable,
                    host: usersTable,
                })
                .from(reservationsTable)
                .leftJoin(experiencesTable, eq(reservationsTable.experienceId, experiencesTable.id))
                .leftJoin(experienceTimeSlotsTable, eq(reservationsTable.timeSlotId, experienceTimeSlotsTable.id))
                .leftJoin(usersTable, eq(experiencesTable.hostId, usersTable.id))
                .where(and(...whereConditions))
                .orderBy(desc(reservationsTable.createdAt))
                .limit(limit)
                .offset(offset);
                
            // Get total count for pagination
            const [countResult] = await db
                .select({ count: count() })
                .from(reservationsTable)
                .where(and(...whereConditions));
                
            const total = countResult?.count || 0;
            
            return {
                results,
                total,
                limit,
                offset,
            };
        });
    }
}

export type InsertReservation = InferInsertModel<typeof reservationsTable>;
export type UpdateReservation = Partial<Omit<InsertReservation, "id">>;
