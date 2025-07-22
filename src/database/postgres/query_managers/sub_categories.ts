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

    public async getBySlug(slug: string) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .select()
                .from(subCategoriesTable)
                .where(eq(subCategoriesTable.slug, slug));

            return results[0] || null;
        });
    }

    public async getByCategoryId(categoryId: number) {
        return await this.withDatabase(async (db) => {
            return await db
                .select()
                .from(subCategoriesTable)
                .where(eq(subCategoriesTable.categoryId, categoryId));
        });
    }

    public async update(id: number, data: UpdateSubCategory) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .update(subCategoriesTable)
                .set(data)
                .where(eq(subCategoriesTable.id, id))
                .returning();

            return results[0] || null;
        });
    }

    public async create(data: InsertSubCategory) {
        return await this.withDatabase(async (db) => {
            const results = await db
                .insert(subCategoriesTable)
                .values(data)
                .returning();

            return results[0] || null;
        });
    }
}

export type InsertSubCategory = InferInsertModel<typeof subCategoriesTable>;
export type UpdateSubCategory = Partial<Omit<InsertSubCategory, "id">>;
