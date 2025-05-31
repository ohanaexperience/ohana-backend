import { InferInsertModel, eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { subCategoriesTable } from "@/db/schema";

export class SubCategoriesQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(subCategoriesTable);
    }

    public async getById(id: number) {
        const results = await this.db
            .select()
            .from(subCategoriesTable)
            .where(eq(subCategoriesTable.id, id));

        return results[0] || null;
    }
}

export type InsertSubCategory = InferInsertModel<typeof subCategoriesTable>;
export type UpdateSubCategory = Partial<Omit<InsertSubCategory, "id">>;
