import { eq, InferInsertModel } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { experiencesTable, experienceAvailabilityTable } from "@/db/schema";

export class ExperiencesQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(experiencesTable);
    }

    public async getAllByHostId(hostId: string) {
        return await this.db
            .select()
            .from(experiencesTable)
            .where(eq(experiencesTable.hostId, hostId));
    }

    public async getByUserId(userId: string) {
        const results = await this.db
            .select()
            .from(experiencesTable)
            .where(eq(experiencesTable.hostId, userId))
            .limit(1);

        return results[0] || null;
    }

    public async getAllAvailability() {
        const results = await this.db
            .select()
            .from(experienceAvailabilityTable);

        return results;
    }

    public async create(data: InsertExperience) {
        const results = await this.db
            .insert(experiencesTable)
            .values(data)
            .returning();

        return results[0] || null;
    }

    public async createAvailability(data: InsertAvailability) {
        const results = await this.db
            .insert(experienceAvailabilityTable)
            .values(data)
            .returning();

        return results[0] || null;
    }

    public async update(userId: string, data: UpdateExperience) {
        return await this.db
            .update(experiencesTable)
            .set(data)
            .where(eq(experiencesTable.hostId, userId))
            .returning();
    }

    public async delete(id: number) {
        return await this.db
            .delete(experiencesTable)
            .where(eq(experiencesTable.id, id));
    }
}

// Experience
export type InsertExperience = InferInsertModel<typeof experiencesTable>;
export type UpdateExperience = Partial<Omit<InsertExperience, "id">>;

// Experience Availability
export type InsertAvailability = InferInsertModel<
    typeof experienceAvailabilityTable
>;
