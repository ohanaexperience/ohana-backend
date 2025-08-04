import { eq, desc, and, gte, lte, InferInsertModel } from "drizzle-orm";
import { BaseQueryManager } from "./base";
import { reservationEventsTable } from "@/database/schemas";

export class ReservationEventsQueryManager extends BaseQueryManager {
    
    public async create(data: InsertReservationEvent) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .insert(reservationEventsTable)
                .values(data)
                .returning();
            
            return results[0];
        });
    }
    
    public async createMany(events: InsertReservationEvent[]) {
        return await this.withDatabase(async (db) => {
            return await db
                .insert(reservationEventsTable)
                .values(events)
                .returning();
        });
    }
    
    public async getByReservationId(reservationId: string) {
        return await this.withDatabase(async (db) => {
            return await db
                .select()
                .from(reservationEventsTable)
                .where(eq(reservationEventsTable.reservationId, reservationId))
                .orderBy(desc(reservationEventsTable.createdAt));
        });
    }
    
    public async getByEventType(eventType: string, limit = 100) {
        return await this.withDatabase(async (db) => {
            return await db
                .select()
                .from(reservationEventsTable)
                .where(eq(reservationEventsTable.eventType, eventType))
                .orderBy(desc(reservationEventsTable.createdAt))
                .limit(limit);
        });
    }
    
    public async getByDateRange(startDate: Date, endDate: Date) {
        return await this.withDatabase(async (db) => {
            return await db
                .select()
                .from(reservationEventsTable)
                .where(
                    and(
                        gte(reservationEventsTable.createdAt, startDate),
                        lte(reservationEventsTable.createdAt, endDate)
                    )
                )
                .orderBy(desc(reservationEventsTable.createdAt));
        });
    }
    
    public async getLatestEventForReservation(reservationId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(reservationEventsTable)
                .where(eq(reservationEventsTable.reservationId, reservationId))
                .orderBy(desc(reservationEventsTable.createdAt))
                .limit(1);
            
            return results[0] || null;
        });
    }
}

// Types
export type InsertReservationEvent = InferInsertModel<typeof reservationEventsTable>;
export type ReservationEventType = 
    | 'created' 
    | 'hold_created'
    | 'hold_converted'
    | 'hold_expired'
    | 'payment_initiated' 
    | 'payment_captured' 
    | 'payment_failed'
    | 'payment_recovered'
    | 'confirmed' 
    | 'cancelled' 
    | 'refunded'
    | 'expired';