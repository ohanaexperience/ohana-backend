import { eq, InferInsertModel } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { reservationsTable } from "@/db/schema";

export class ReservationsQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(reservationsTable);
    }

    public async getByUserId(userId: string) {
        return await this.db
            .select()
            .from(reservationsTable)
            .where(eq(reservationsTable.userId, userId));
    }

    public async getById(reservationId: string) {
        const results = await this.db
            .select()
            .from(reservationsTable)
            .where(eq(reservationsTable.id, reservationId))
            .limit(1);

        return results[0] || null;
    }

    public async getByReference(reference: string) {
        const results = await this.db
            .select()
            .from(reservationsTable)
            .where(eq(reservationsTable.reservationReference, reference))
            .limit(1);

        return results[0] || null;
    }

    public async create(data: InsertReservation) {
        const results = await this.db
            .insert(reservationsTable)
            .values(data)
            .returning();

        return results[0] || null;
    }

    public async update(reservationId: string, data: UpdateReservation) {
        const results = await this.db
            .update(reservationsTable)
            .set(data)
            .where(eq(reservationsTable.id, reservationId))
            .returning();

        return results[0] || null;
    }

    public async updateByPaymentIntent(
        paymentIntentId: string,
        data: UpdateReservation
    ) {
        const results = await this.db
            .update(reservationsTable)
            .set(data)
            .where(eq(reservationsTable.paymentIntentId, paymentIntentId))
            .returning();

        return results[0] || null;
    }
}

export type InsertReservation = InferInsertModel<typeof reservationsTable>;
export type UpdateReservation = Partial<Omit<InsertReservation, "id">>;
