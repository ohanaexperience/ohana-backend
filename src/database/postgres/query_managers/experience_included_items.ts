import { eq } from "drizzle-orm";

import { experienceIncludedItemsTable } from "@/database/schemas/experiences";

import { BaseQueryManager } from "./base";

export class ExperienceIncludedItemsQueryManager extends BaseQueryManager {
    async create(data: {
        experienceId: string;
        icon: {
            name: string;
            type: 'material' | 'ionicons' | 'fontawesome5';
        };
        text: string;
        sortOrder: number;
    }) {
        return await this.withDatabase(async (db) => {
            const [result] = await db
                .insert(experienceIncludedItemsTable)
                .values(data)
                .returning();
            return result;
        });
    }

    async getByExperienceId(experienceId: string) {
        return await this.withDatabase(async (db) => {
            return await db
                .select()
                .from(experienceIncludedItemsTable)
                .where(eq(experienceIncludedItemsTable.experienceId, experienceId))
                .orderBy(experienceIncludedItemsTable.sortOrder);
        });
    }

    async update(id: string, data: Partial<{
        icon: {
            name: string;
            type: 'material' | 'ionicons' | 'fontawesome5';
        };
        text: string;
        sortOrder: number;
        updatedAt: Date;
    }>) {
        return await this.withDatabase(async (db) => {
            const [result] = await db
                .update(experienceIncludedItemsTable)
                .set(data)
                .where(eq(experienceIncludedItemsTable.id, id))
                .returning();
            return result;
        });
    }

    async delete(id: string) {
        return await this.withDatabase(async (db) => {
            await db
                .delete(experienceIncludedItemsTable)
                .where(eq(experienceIncludedItemsTable.id, id));
        });
    }

    async deleteByExperienceId(experienceId: string) {
        return await this.withDatabase(async (db) => {
            await db
                .delete(experienceIncludedItemsTable)
                .where(eq(experienceIncludedItemsTable.experienceId, experienceId));
        });
    }
}