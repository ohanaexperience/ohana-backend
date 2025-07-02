import { InferInsertModel, eq } from "drizzle-orm";

import { BaseQueryManager } from "./base";
import { subCategoriesTable } from "@/database/schemas";

export class SubCategoriesQueryManager extends BaseQueryManager {

    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(subCategoriesTable)
        );
    }

    public async getById(id: number) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(subCategoriesTable)
                .where(eq(subCategoriesTable.id, id));

            return results[0] || null;
        });
    }
}

export type InsertSubCategory = InferInsertModel<typeof subCategoriesTable>;
export type UpdateSubCategory = Partial<Omit<InsertSubCategory, "id">>;
