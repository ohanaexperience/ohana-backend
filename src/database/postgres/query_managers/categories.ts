import { InferInsertModel, eq } from "drizzle-orm";

import { BaseQueryManager } from "./base";
import { categoriesTable } from "@/database/schemas";

export class CategoriesQueryManager extends BaseQueryManager {

    public async getAll() {
        return await this.withDatabase(async (db) =>
            db.select().from(categoriesTable)
        );
    }

    public async getById(id: number) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(categoriesTable)
                .where(eq(categoriesTable.id, id));

            return results[0] || null;
        });
    }
}

export type InsertCategory = InferInsertModel<typeof categoriesTable>;
export type UpdateCategory = Partial<Omit<InsertCategory, "id">>;
