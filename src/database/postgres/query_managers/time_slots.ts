import { eq, InferInsertModel, SQL, gte, lte, and, or, sql, count, sum, inArray } from "drizzle-orm";

import dayjs from "dayjs";

import { BaseQueryManager } from "./base";
import { experienceTimeSlotsTable, reservationsTable } from "@/database/schemas";

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

    public async getByIdWithBookedCount(timeSlotId: string, includeHeld: boolean = false) {
        return await this.withDatabase(async (db) => {
            // First get the time slot
            const timeSlot = await db
                .select()
                .from(experienceTimeSlotsTable)
                .where(eq(experienceTimeSlotsTable.id, timeSlotId))
                .then(results => results[0]);

            if (!timeSlot) {
                return null;
            }

            // Then get the sum of guests for this time slot
            const statusConditions = includeHeld 
                ? or(
                    eq(reservationsTable.status, 'held'),
                    eq(reservationsTable.status, 'pending'),
                    eq(reservationsTable.status, 'confirmed')
                )
                : or(
                    eq(reservationsTable.status, 'pending'),
                    eq(reservationsTable.status, 'confirmed')
                );
            
            const [bookingData] = await db
                .select({
                    totalGuests: sum(reservationsTable.numberOfGuests).as('total_guests'),
                })
                .from(reservationsTable)
                .where(
                    and(
                        eq(reservationsTable.timeSlotId, timeSlotId),
                        statusConditions
                    )
                );

            return {
                ...timeSlot,
                bookedCount: Number(bookingData?.totalGuests || 0),
            };
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

        // Note: Party size filtering is now done after calculating booked counts

        return await this.withDatabase(async (db) => {
            // Get total count for pagination
            const [countResult] = await db
                .select({ count: count() })
                .from(experienceTimeSlotsTable)
                .where(and(...conditions));

            // Get paginated results with dynamic booked count
            const timeslotsRaw = await db
                .select({
                    id: experienceTimeSlotsTable.id,
                    experienceId: experienceTimeSlotsTable.experienceId,
                    availabilityId: experienceTimeSlotsTable.availabilityId,
                    slotDateTime: experienceTimeSlotsTable.slotDateTime,
                    localDate: experienceTimeSlotsTable.localDate,
                    localTime: experienceTimeSlotsTable.localTime,
                    maxCapacity: experienceTimeSlotsTable.maxCapacity,
                    status: experienceTimeSlotsTable.status,
                    price: sql<number>`50`, // TODO: Add price to schema
                    duration: sql<number>`120`, // TODO: Add duration from experience
                })
                .from(experienceTimeSlotsTable)
                .where(and(...conditions))
                .orderBy(experienceTimeSlotsTable.slotDateTime)
                .limit(limit)
                .offset(offset);

            // Get booked counts for all time slots
            const timeSlotIds = timeslotsRaw.map(ts => ts.id);
            const bookingCounts = await db
                .select({
                    timeSlotId: reservationsTable.timeSlotId,
                    totalGuests: sum(reservationsTable.numberOfGuests).as('total_guests'),
                })
                .from(reservationsTable)
                .where(
                    and(
                        inArray(reservationsTable.timeSlotId, timeSlotIds),
                        or(
                            eq(reservationsTable.status, 'held'),
                            eq(reservationsTable.status, 'pending'),
                            eq(reservationsTable.status, 'confirmed')
                        )
                    )
                )
                .groupBy(reservationsTable.timeSlotId);

            // Merge booked counts with time slots
            const bookingCountMap = new Map(
                bookingCounts.map(bc => [bc.timeSlotId, Number(bc.totalGuests || 0)])
            );

            let timeslots = timeslotsRaw.map(ts => {
                const bookedCount = bookingCountMap.get(ts.id) || 0;
                return {
                    ...ts,
                    bookedCount,
                    remainingCapacity: ts.maxCapacity - bookedCount,
                };
            });

            // Apply party size filter if provided
            if (partySize) {
                timeslots = timeslots.filter(ts => ts.remainingCapacity >= partySize);
            }

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

    // Removed updateBookedCount - booked count is now calculated dynamically

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
            // Get all time slots in date range
            const timeslots = await db
                .select({
                    id: experienceTimeSlotsTable.id,
                    date: experienceTimeSlotsTable.localDate,
                    maxCapacity: experienceTimeSlotsTable.maxCapacity,
                    status: experienceTimeSlotsTable.status,
                })
                .from(experienceTimeSlotsTable)
                .where(
                    and(
                        eq(experienceTimeSlotsTable.experienceId, experienceId),
                        gte(experienceTimeSlotsTable.localDate, dayjs(startDate).toDate()),
                        lte(experienceTimeSlotsTable.localDate, dayjs(endDate).toDate())
                    )
                );

            // Get booked counts for all time slots
            const timeSlotIds = timeslots.map(ts => ts.id);
            const bookingCounts = timeSlotIds.length > 0 ? await db
                .select({
                    timeSlotId: reservationsTable.timeSlotId,
                    totalGuests: sum(reservationsTable.numberOfGuests).as('total_guests'),
                })
                .from(reservationsTable)
                .where(
                    and(
                        inArray(reservationsTable.timeSlotId, timeSlotIds),
                        or(
                            eq(reservationsTable.status, 'held'),
                            eq(reservationsTable.status, 'pending'),
                            eq(reservationsTable.status, 'confirmed')
                        )
                    )
                )
                .groupBy(reservationsTable.timeSlotId) : [];

            // Create a map of booked counts
            const bookingCountMap = new Map(
                bookingCounts.map(bc => [bc.timeSlotId, Number(bc.totalGuests || 0)])
            );

            // Group time slots by date
            const dateMap = new Map<string, typeof timeslots>();
            timeslots.forEach(ts => {
                const dateKey = dayjs(ts.date).format('YYYY-MM-DD');
                if (!dateMap.has(dateKey)) {
                    dateMap.set(dateKey, []);
                }
                dateMap.get(dateKey)!.push(ts);
            });

            // Calculate summary for each date
            const dates = Array.from(dateMap.entries()).map(([date, slots]) => {
                let totalCapacity = 0;
                let totalBooked = 0;
                let availableSlots = 0;

                slots.forEach(slot => {
                    const booked = bookingCountMap.get(slot.id) || 0;
                    totalCapacity += slot.maxCapacity;
                    totalBooked += booked;
                    if (slot.status === 'available' && booked < slot.maxCapacity) {
                        availableSlots++;
                    }
                });

                return {
                    date,
                    available: availableSlots > 0,
                    minPrice: 50, // TODO: Add price to schema
                    slotsAvailable: availableSlots,
                    totalSlots: slots.length,
                    remainingCapacity: totalCapacity - totalBooked,
                };
            });

            return {
                experienceId,
                startDate,
                endDate,
                dates: dates.sort((a, b) => a.date.localeCompare(b.date)),
            };
        });
    }
}

// Types
export type InsertTimeSlot = InferInsertModel<typeof experienceTimeSlotsTable>;
export type UpdateTimeSlot = Partial<Omit<InsertTimeSlot, "id">>;
