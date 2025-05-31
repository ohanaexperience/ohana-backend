import { InferInsertModel, eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { categoriesTable } from "@/db/schema";

export class CategoriesQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(categoriesTable);
    }

    public async getById(id: number) {
        const results = await this.db
            .select()
            .from(categoriesTable)
            .where(eq(categoriesTable.id, id));

        return results[0] || null;
    }
}

export type InsertCategory = InferInsertModel<typeof categoriesTable>;
export type UpdateCategory = Partial<Omit<InsertCategory, "id">>;
