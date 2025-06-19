import { eq, InferInsertModel, SQL, gte, lte, and, sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import dayjs from "dayjs";

import { experienceTimeSlotsTable } from "@/db/schema";

export class TimeSlotsQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async createTimeSlots(timeSlotsData: InsertTimeSlot[]) {
        return await this.db
            .insert(experienceTimeSlotsTable)
            .values(timeSlotsData)
            .returning();
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

        const results = await this.db
            .select()
            .from(experienceTimeSlotsTable)
            .where(and(...conditions))
            .orderBy(experienceTimeSlotsTable.slotDateTime);

        return results;
    }

    public async getAll() {
        return await this.db.select().from(experienceTimeSlotsTable);
    }
}

// Types
export type InsertTimeSlot = InferInsertModel<typeof experienceTimeSlotsTable>;
export type UpdateTimeSlot = Partial<Omit<InsertTimeSlot, "id">>;
