import { eq, InferInsertModel } from "drizzle-orm";

import { BaseQueryManager } from "./base";
import { hostVerificationsTable } from "@/database/schemas";

export class HostVerificationsQueryManager extends BaseQueryManager {
    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(hostVerificationsTable)
        );
    }

    public async getByUserId(userId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(hostVerificationsTable)
                .where(eq(hostVerificationsTable.userId, userId))
                .limit(1);

            return results[0] || null;
        });
    }

    public async create(data: InsertHostVerifications) {
        return await this.withDatabase(async (db) =>
            db.insert(hostVerificationsTable).values(data).returning()
        );
    }

    public async update(userId: string, data: UpdateHostVerification) {
        return await this.withDatabase(async (db) =>
            db
                .update(hostVerificationsTable)
                .set(data)
                .where(eq(hostVerificationsTable.userId, userId))
                .returning()
        );
    }

    public async delete(userId: string) {
        return await this.withDatabase(async (db) =>
            db
                .delete(hostVerificationsTable)
                .where(eq(hostVerificationsTable.userId, userId))
        );
    }
}

export type InsertHostVerifications = InferInsertModel<
    typeof hostVerificationsTable
>;
export type UpdateHostVerification = Partial<
    Omit<InsertHostVerifications, "id">
>;
