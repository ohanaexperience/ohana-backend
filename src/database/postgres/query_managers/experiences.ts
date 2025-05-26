import { eq, InferInsertModel } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { experiencesTable } from "../../../../db/schema/experiences";

export class ExperiencesQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(experiencesTable);
    }

    public async getByUserId(userId: string) {
        const results = await this.db
            .select()
            .from(experiencesTable)
            .where(eq(experiencesTable.hostId, userId))
            .limit(1);

        return results[0] || null;
    }

    public async create(data: InsertExperience) {
        return await this.db.insert(experiencesTable).values(data).returning();
    }

    public async update(userId: string, data: UpdateExperience) {
        return await this.db
            .update(experiencesTable)
            .set(data)
            .where(eq(experiencesTable.hostId, userId))
            .returning();
    }

    public async delete(id: string) {
        return await this.db
            .delete(experiencesTable)
            .where(eq(experiencesTable.hostId, id));
    }
}

export type InsertExperience = InferInsertModel<typeof experiencesTable>;
export type UpdateExperience = Partial<Omit<InsertExperience, "id">>;
