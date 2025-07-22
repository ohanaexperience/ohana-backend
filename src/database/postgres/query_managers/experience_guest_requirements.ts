import { eq } from "drizzle-orm";

import { experienceGuestRequirementsTable } from "@/database/schemas/experiences";

import { BaseQueryManager } from "./base";

export class ExperienceGuestRequirementsQueryManager extends BaseQueryManager {
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
                .insert(experienceGuestRequirementsTable)
                .values(data)
                .returning();
            return result;
        });
    }

    async getByExperienceId(experienceId: string) {
        return await this.withDatabase(async (db) => {
            return await db
                .select()
                .from(experienceGuestRequirementsTable)
                .where(eq(experienceGuestRequirementsTable.experienceId, experienceId))
                .orderBy(experienceGuestRequirementsTable.sortOrder);
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
                .update(experienceGuestRequirementsTable)
                .set(data)
                .where(eq(experienceGuestRequirementsTable.id, id))
                .returning();
            return result;
        });
    }

    async delete(id: string) {
        return await this.withDatabase(async (db) => {
            await db
                .delete(experienceGuestRequirementsTable)
                .where(eq(experienceGuestRequirementsTable.id, id));
        });
    }

    async deleteByExperienceId(experienceId: string) {
        return await this.withDatabase(async (db) => {
            await db
                .delete(experienceGuestRequirementsTable)
                .where(eq(experienceGuestRequirementsTable.experienceId, experienceId));
        });
    }
}