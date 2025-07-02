import { eq, InferInsertModel } from "drizzle-orm";

import { BaseQueryManager } from "./base";
import { hostsTable } from "@/database/schemas";

export class HostsQueryManager extends BaseQueryManager {

    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(hostsTable)
        );
    }

    public async getByUserId(userId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(hostsTable)
                .where(eq(hostsTable.id, userId))
                .limit(1);

            return results[0] || null;
        });
    }

    public async create(data: InsertHost) {
        return await this.withDatabase(async (db) =>
            db.insert(hostsTable).values(data).returning()
        );
    }

    public async update(userId: string, data: UpdateHost) {
        return await this.withDatabase(async (db) =>
            db.update(hostsTable)
                .set(data)
                .where(eq(hostsTable.id, userId))
                .returning()
        );
    }

    public async delete(userId: string) {
        return await this.withDatabase(async (db) =>
            db.delete(hostsTable)
                .where(eq(hostsTable.id, userId))
        );
    }
}

export type InsertHost = InferInsertModel<typeof hostsTable>;
export type UpdateHost = Partial<Omit<InsertHost, "id">>;
