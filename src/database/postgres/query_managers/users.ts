import { eq, InferInsertModel } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { usersTable } from "../../../../db/schema/users";

export class UsersQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(usersTable);
    }

    public async getByUserId(userId: string) {
        return await this.db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId));
    }

    public async create(data: InsertUser) {
        return await this.db.insert(usersTable).values(data).returning();
    }

    public async update(userId: string, data: UpdateUser) {
        return await this.db
            .update(usersTable)
            .set(data)
            .where(eq(usersTable.id, userId))
            .returning();
    }

    public async delete(userId: string) {
        return await this.db
            .delete(usersTable)
            .where(eq(usersTable.id, userId));
    }
}

export type InsertUser = InferInsertModel<typeof usersTable>;
export type UpdateUser = Partial<Omit<InsertUser, "id">>;
