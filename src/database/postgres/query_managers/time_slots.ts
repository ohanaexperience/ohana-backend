import { eq, InferInsertModel, SQL, gte, lte, and, sql, count, sum } from "drizzle-orm";

import dayjs from "dayjs";

import { BaseQueryManager } from "./base";
import { experienceTimeSlotsTable } from "@/database/schemas";

export class TimeSlotsQueryManager extends BaseQueryManager {

    public async getById(timeSlotId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(experienceTimeSlotsTable)
                .where(eq(experienceTimeSlotsTable.id, timeSlotId));

            return results[0] || null;
        });
    }

    public async createTimeSlots(timeSlotsData: InsertTimeSlot[]) {
        return await this.withDatabase(async (db) =>
            db.insert(experienceTimeSlotsTable)
                .values(timeSlotsData)
                .returning()
        );
    }

    public async getByDateRange(params: {
        experienceId: string;
        startDate?: string;
        endDate?: string;
    }) {
        const { experienceId, startDate, endDate } = params;

        const conditions = [
            eq(experienceTimeSlotsTable.experienceId, experienceId),
        ];

        if (startDate) {
            conditions.push(
                gte(
                    experienceTimeSlotsTable.localDate,
                    dayjs(startDate).toDate()
                )
            );
        }

        if (endDate) {
            conditions.push(
                lte(experienceTimeSlotsTable.localDate, dayjs(endDate).toDate())
            );
        }

        return await this.withDatabase(async (db) =>
            db.select()
                .from(experienceTimeSlotsTable)
                .where(and(...conditions))
                .orderBy(experienceTimeSlotsTable.slotDateTime)
        );
    }

    public async getByDateRangePaginated(params: {
        experienceId: string;
        startDate?: string;
        endDate?: string;
        partySize?: number;
        limit: number;
        offset: number;
        timezone?: string;
    }) {
        const { experienceId, startDate, endDate, partySize, limit, offset } = params;

        const conditions = [
            eq(experienceTimeSlotsTable.experienceId, experienceId),
            eq(experienceTimeSlotsTable.status, 'available'),
        ];

        if (startDate) {
            conditions.push(
                gte(
                    experienceTimeSlotsTable.localDate,
                    dayjs(startDate).startOf('day').toDate()
                )
            );
        }

        if (endDate) {
            conditions.push(
                lte(
                    experienceTimeSlotsTable.localDate, 
                    dayjs(endDate).endOf('day').toDate()
                )
            );
        }

        // Filter by party size if provided
        if (partySize) {
            conditions.push(
                sql`${experienceTimeSlotsTable.maxCapacity} - ${experienceTimeSlotsTable.bookedCount} >= ${partySize}`
            );
        }

        return await this.withDatabase(async (db) => {
            // Get total count for pagination
            const [countResult] = await db
                .select({ count: count() })
                .from(experienceTimeSlotsTable)
                .where(and(...conditions));

            // Get paginated results
            const timeslots = await db
                .select({
                    id: experienceTimeSlotsTable.id,
                    experienceId: experienceTimeSlotsTable.experienceId,
                    availabilityId: experienceTimeSlotsTable.availabilityId,
                    slotDateTime: experienceTimeSlotsTable.slotDateTime,
                    localDate: experienceTimeSlotsTable.localDate,
                    localTime: experienceTimeSlotsTable.localTime,
                    maxCapacity: experienceTimeSlotsTable.maxCapacity,
                    bookedCount: experienceTimeSlotsTable.bookedCount,
                    remainingCapacity: sql<number>`${experienceTimeSlotsTable.maxCapacity} - ${experienceTimeSlotsTable.bookedCount}`,
                    status: experienceTimeSlotsTable.status,
                    price: sql<number>`50`, // TODO: Add price to schema
                    duration: sql<number>`120`, // TODO: Add duration from experience
                })
                .from(experienceTimeSlotsTable)
                .where(and(...conditions))
                .orderBy(experienceTimeSlotsTable.slotDateTime)
                .limit(limit)
                .offset(offset);

            return {
                timeslots,
                pagination: {
                    total: Number(countResult.count),
                    limit,
                    offset,
                    hasMore: offset + limit < Number(countResult.count),
                }
            };
        });
    }

    public async updateBookedCount(timeSlotId: string, newBookedCount: number) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .update(experienceTimeSlotsTable)
                .set({
                    bookedCount: newBookedCount,
                    updatedAt: new Date(),
                })
                .where(eq(experienceTimeSlotsTable.id, timeSlotId))
                .returning();

            return results[0] || null;
        });
    }

    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(experienceTimeSlotsTable)
        );
    }

    public async getAvailabilitySummary(params: {
        experienceId: string;
        startDate: string;
        endDate: string;
        timezone?: string;
    }) {
        const { experienceId, startDate, endDate } = params;

        return await this.withDatabase(async (db) => {
            const results = await db
                .select({
                    date: experienceTimeSlotsTable.localDate,
                    totalSlots: count(experienceTimeSlotsTable.id).as('total_slots'),
                    availableSlots: sum(
                        sql<number>`case when ${experienceTimeSlotsTable.status} = 'available' and ${experienceTimeSlotsTable.bookedCount} < ${experienceTimeSlotsTable.maxCapacity} then 1 else 0 end`
                    ).as('available_slots'),
                    minPrice: sql<number>`50`.as('min_price'), // TODO: Add price to schema
                    totalCapacity: sum(experienceTimeSlotsTable.maxCapacity).as('total_capacity'),
                    totalBooked: sum(experienceTimeSlotsTable.bookedCount).as('total_booked'),
                })
                .from(experienceTimeSlotsTable)
                .where(
                    and(
                        eq(experienceTimeSlotsTable.experienceId, experienceId),
                        gte(experienceTimeSlotsTable.localDate, dayjs(startDate).toDate()),
                        lte(experienceTimeSlotsTable.localDate, dayjs(endDate).toDate())
                    )
                )
                .groupBy(experienceTimeSlotsTable.localDate)
                .orderBy(experienceTimeSlotsTable.localDate);

            return {
                experienceId,
                startDate,
                endDate,
                dates: results.map(row => ({
                    date: dayjs(row.date).format('YYYY-MM-DD'),
                    available: Number(row.availableSlots || 0) > 0,
                    minPrice: Number(row.minPrice),
                    slotsAvailable: Number(row.availableSlots || 0),
                    totalSlots: Number(row.totalSlots),
                    remainingCapacity: Number(row.totalCapacity || 0) - Number(row.totalBooked || 0),
                }))
            };
        });
    }
}

// Types
export type InsertTimeSlot = InferInsertModel<typeof experienceTimeSlotsTable>;
export type UpdateTimeSlot = Partial<Omit<InsertTimeSlot, "id">>;
