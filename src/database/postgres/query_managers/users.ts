import { eq, InferInsertModel } from "drizzle-orm";

import { BaseQueryManager } from "./base";

import { usersTable } from "@/database/schemas";

export class UsersQueryManager extends BaseQueryManager {
    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(usersTable)
        );
    }

    public async getByUserId(userId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.id, userId));

            return results[0] || null;
        });
    }

    public async getById(userId: string) {
        return this.getByUserId(userId);
    }

    public async getByStripeCustomerId(stripeCustomerId: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.stripeCustomerId, stripeCustomerId));

            return results[0] || null;
        });
    }

    public async create(data: InsertUser) {
        return await this.withDatabase(async (db) => {
            return await db.insert(usersTable).values(data).returning();
        });
    }

    public async update(userId: string, data: UpdateUser) {
        return await this.withDatabase(async (db) => {
            return await db
                .update(usersTable)
                .set(data)
                .where(eq(usersTable.id, userId))
                .returning();
        });
    }

    public async delete(userId: string) {
        return await this.withDatabase(async (db) => {
            return await db.delete(usersTable).where(eq(usersTable.id, userId));
        });
    }
}

export type InsertUser = InferInsertModel<typeof usersTable>;
export type UpdateUser = Partial<Omit<InsertUser, "id">>;
