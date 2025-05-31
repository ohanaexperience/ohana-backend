import { eq, InferInsertModel } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { hostsTable, experiencesTable } from "@/db/schema";

export class HostsQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(hostsTable);
    }

    public async getByUserId(userId: string) {
        const results = await this.db
            .select()
            .from(hostsTable)
            .where(eq(hostsTable.id, userId))
            .limit(1);

        return results[0] || null;
    }

    public async create(data: InsertHost) {
        return await this.db.insert(hostsTable).values(data).returning();
    }

    public async update(userId: string, data: UpdateHost) {
        return await this.db
            .update(hostsTable)
            .set(data)
            .where(eq(hostsTable.id, userId))
            .returning();
    }

    public async delete(userId: string) {
        return await this.db
            .delete(hostsTable)
            .where(eq(hostsTable.id, userId));
    }

    public async getExperiences(hostId: string) {
        return await this.db
            .select()
            .from(experiencesTable)
            .where(eq(experiencesTable.hostId, userId));
    }
}

export type InsertHost = InferInsertModel<typeof hostsTable>;
export type UpdateHost = Partial<Omit<InsertHost, "id">>;
