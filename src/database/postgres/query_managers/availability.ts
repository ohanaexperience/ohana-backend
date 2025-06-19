import { eq, InferInsertModel } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { experienceAvailabilityTable } from "@/db/schema";

export class AvailabilityQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        const results = await this.db
            .select()
            .from(experienceAvailabilityTable);

        return results;
    }

    public async create(data: InsertAvailability) {
        const results = await this.db
            .insert(experienceAvailabilityTable)
            .values(data)
            .returning();

        return results[0] || null;
    }

    public async updateById(availabilityId: string, data: UpdateAvailability) {
        const results = await this.db
            .update(experienceAvailabilityTable)
            .set(data)
            .where(eq(experienceAvailabilityTable.id, availabilityId))
            .returning();

        return results[0] || null;
    }

    // public async delete(availabilityId: string) {
    //     const results = await this.db
    //         .delete(experienceAvailabilityTable)
    //         .where(eq(experienceAvailabilityTable.id, availabilityId));

    //     return results[0] || null;
    // }
}

export type InsertAvailability = InferInsertModel<
    typeof experienceAvailabilityTable
>;
export type UpdateAvailability = Partial<Omit<InsertAvailability, "id">>;
