import { eq, InferInsertModel } from "drizzle-orm";

import { BaseQueryManager } from "./base";
import { experienceAvailabilityTable } from "@/database/schemas";

export class AvailabilityQueryManager extends BaseQueryManager {

    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(experienceAvailabilityTable)
        );
    }

    public async create(data: InsertAvailability) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .insert(experienceAvailabilityTable)
                .values(data)
                .returning();

            return results[0] || null;
        });
    }

    public async updateById(availabilityId: string, data: UpdateAvailability) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .update(experienceAvailabilityTable)
                .set(data)
                .where(eq(experienceAvailabilityTable.id, availabilityId))
                .returning();

            return results[0] || null;
        });
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
