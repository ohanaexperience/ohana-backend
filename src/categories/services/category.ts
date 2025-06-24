import { CategoryServiceOptions } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";

export class CategoryService {
    private readonly db: Postgres;

    constructor({ database }: CategoryServiceOptions) {
        this.db = database;
    }

    async hostGetCategories(request: { authorization: string }) {
        const { authorization } = request;

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const host = await this.db.hosts.getByUserId(sub);

        if (!host) {
            throw new Error(ERRORS.HOST.NOT_FOUND.CODE);
        }

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
