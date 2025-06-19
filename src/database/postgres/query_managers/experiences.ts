import {
    eq,
    InferInsertModel,
    SQL,
    gte,
    lte,
    and,
    sql,
    ilike,
} from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { experiencesTable } from "@/db/schema";

export class ExperiencesQueryManager {
    private db: NodePgDatabase;

    constructor(database: NodePgDatabase) {
        this.db = database;
    }

    public async getAll() {
        return await this.db.select().from(experiencesTable);
    }

    public async getAllByHostId(hostId: string) {
        return await this.db
            .select()
            .from(experiencesTable)
            .where(eq(experiencesTable.hostId, hostId));
    }

    public async getById(experienceId: string) {
        const results = await this.db
            .select()
            .from(experiencesTable)
            .where(eq(experiencesTable.id, experienceId));

        return results[0] || null;
    }

    public async getByUserId(userId: string) {
        const results = await this.db
            .select()
            .from(experiencesTable)
            .where(eq(experiencesTable.hostId, userId))
            .limit(1);

        return results[0] || null;
    }

    public async create(data: InsertExperience) {
        const results = await this.db
            .insert(experiencesTable)
            .values(data)
            .returning();

        return results[0] || null;
    }

    public async update(experienceId: string, data: UpdateExperience) {
        const results = await this.db
            .update(experiencesTable)
            .set(data)
            .where(eq(experiencesTable.id, experienceId))
            .returning();

        return results[0] || null;
    }

    public async delete(id: string) {
        return await this.db
            .delete(experiencesTable)
            .where(eq(experiencesTable.id, id));
    }

    public async searchExperiences(filters: Record<string, any>) {
        const conditions: SQL[] = [];

        const addTextFilter = (key: string, column: any) => {
            const value = filters[key] as string;
            if (value) {
                conditions.push(ilike(column, `%${value}%`));
            }
        };

        const addExactFilter = (key: string, column: any) => {
            const value = filters[key];
            if (value !== undefined) {
                conditions.push(eq(column, value));
            }
        };

        const addRangeFilter = (
            minKey: string,
            maxKey: string,
            column: any,
            minColumn?: any,
            maxColumn?: any
        ) => {
            const minValue = filters[minKey] as number;
            const maxValue = filters[maxKey] as number;

            if (minValue) conditions.push(gte(minColumn || column, minValue));
            if (maxValue) conditions.push(lte(maxColumn || column, maxValue));
        };

        const addLocationFilter = (
            lat?: number,
            lng?: number,
            radiusKm?: number
        ) => {
            if (lat && lng && radiusKm) {
                conditions.push(
                    sql`ST_DWithin(
                        ST_SetSRID(ST_Point((${
                            experiencesTable.startingLocation
                        })[0], (${
                        experiencesTable.startingLocation
                    })[1]), 4326)::geography,
                        ST_SetSRID(ST_Point(${sql.raw(
                            lng.toString()
                        )}::float8, ${sql.raw(
                        lat.toString()
                    )}::float8), 4326)::geography,
                        ${sql.raw((radiusKm * 1000).toString())}::float8
                    )`
                );
            }
        };

        // Text searches
        addTextFilter("title", experiencesTable.title);
        addTextFilter("tagline", experiencesTable.tagline);
        addTextFilter("description", experiencesTable.description);
        addTextFilter(
            "startingLocationAddress",
            experiencesTable.startingLocationAddress
        );
        addTextFilter(
            "endingLocationAddress",
            experiencesTable.endingLocationAddress
        );
        addTextFilter("whatToBring", experiencesTable.whatToBring);

        // Exact matches
        addExactFilter("hostId", experiencesTable.hostId);
        addExactFilter("categoryId", experiencesTable.categoryId);
        addExactFilter("subCategoryId", experiencesTable.subCategoryId);
        addExactFilter("experienceType", experiencesTable.experienceType);
        addExactFilter(
            "cancellationPolicy",
            experiencesTable.cancellationPolicy
        );
        addExactFilter(
            "physicalRequirements",
            experiencesTable.physicalRequirements
        );
        addExactFilter("ageRange", experiencesTable.ageRange);
        addExactFilter("status", experiencesTable.status);
        addExactFilter("isPublic", experiencesTable.isPublic);

        // Range filters
        addRangeFilter("minPrice", "maxPrice", experiencesTable.pricePerPerson);
        addRangeFilter(
            "minGuests",
            "maxGuests",
            null,
            experiencesTable.minGuests,
            experiencesTable.maxGuests
        );
        addRangeFilter(
            "minDurationHours",
            "maxDurationHours",
            experiencesTable.durationHours
        );

        // Location filters
        addLocationFilter(
            filters.latitude,
            filters.longitude,
            filters.radiusKm
        );

        const query = this.db.select().from(experiencesTable);

        console.log("conditions", conditions);

        if (conditions.length > 0) {
            return await query.where(and(...conditions));
        }

        return await query;
    }
}

// Experience
export type InsertExperience = InferInsertModel<typeof experiencesTable>;
export type UpdateExperience = Partial<Omit<InsertExperience, "id">>;
