import { CategoryServiceOptions } from "../types";

import Postgres from "@/database/postgres";

export class CategoryService {
    private readonly db: Postgres;

    constructor({ database }: CategoryServiceOptions) {
        this.db = database;
    }

    async getCategories() {
        const categories = await this.db.categories.getAll();
        const subCategories = await this.db.subCategories.getAll();
        const subCategoriesByParent = new Map();

        subCategories.forEach((subCat) => {
            if (!subCategoriesByParent.has(subCat.categoryId)) {
                subCategoriesByParent.set(subCat.categoryId, []);
            }

            subCategoriesByParent.get(subCat.categoryId).push(subCat);
        });

        return categories.map((category) => ({
            ...category,
            subCategories: subCategoriesByParent.get(category.id) || [],
        }));
    }
}
