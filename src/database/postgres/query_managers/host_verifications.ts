import { eq, InferInsertModel } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { hostVerificationsTable } from "@/db/schema";

export class HostVerificationsQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(hostVerificationsTable);
    }

    public async getByUserId(userId: string) {
        const results = await this.db
            .select()
            .from(hostVerificationsTable)
            .where(eq(hostVerificationsTable.userId, userId))
            .limit(1);

        return results[0] || null;
    }

    public async create(data: InsertHostVerifications) {
        return await this.db
            .insert(hostVerificationsTable)
            .values(data)
            .returning();
    }

    public async update(userId: string, data: UpdateHostVerification) {
        return await this.db
            .update(hostVerificationsTable)
            .set(data)
            .where(eq(hostVerificationsTable.userId, userId))
            .returning();
    }

    public async delete(id: string) {
        return await this.db
            .delete(hostVerificationsTable)
            .where(eq(hostVerificationsTable.userId, id));
    }
}

export type InsertHostVerifications = InferInsertModel<
    typeof hostVerificationsTable
>;
export type UpdateHostVerification = Partial<
    Omit<InsertHostVerifications, "id">
>;
