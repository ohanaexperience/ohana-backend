import { eq, InferInsertModel, SQL, gte, lte, and, sql } from "drizzle-orm";

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
}

// Types
export type InsertTimeSlot = InferInsertModel<typeof experienceTimeSlotsTable>;
export type UpdateTimeSlot = Partial<Omit<InsertTimeSlot, "id">>;
