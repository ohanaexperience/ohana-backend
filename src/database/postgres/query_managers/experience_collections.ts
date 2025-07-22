import { and, eq, sql, desc, asc, isNull, gte, InferInsertModel } from "drizzle-orm";
import { BaseQueryManager } from "./base";
import { 
    experienceCollectionsTable, 
    experienceCollectionItemsTable
} from "@/database/schemas/experience_collections";
import { experiencesTable } from "@/database/schemas/experiences";

export class ExperienceCollectionsQueryManager extends BaseQueryManager {
    
    // Collections CRUD
    async createCollection(data: InsertExperienceCollection) {
        return await this.withDatabase(async (db) => {
            const [collection] = await db
                .insert(experienceCollectionsTable)
                .values(data)
                .returning();
            return collection;
        });
    }

    async getCollectionBySlug(slug: string) {
        return await this.withDatabase(async (db) => {
            const [collection] = await db
                .select()
                .from(experienceCollectionsTable)
                .where(eq(experienceCollectionsTable.slug, slug));
            return collection;
        });
    }

    async getActiveCollections() {
        return await this.withDatabase(async (db) =>
            db.select()
                .from(experienceCollectionsTable)
                .where(and(
                    eq(experienceCollectionsTable.isActive, true),
                    eq(experienceCollectionsTable.isPublic, true)
                ))
                .orderBy(asc(experienceCollectionsTable.sortOrder))
        );
    }

    // Collection Items Management
    async addExperienceToCollection(collectionId: number, experienceId: string, position?: number) {
        return await this.withDatabase(async (db) => {
            // Get the next position if not provided
            if (position === undefined) {
                const [maxPosition] = await db
                    .select({ max: sql<number>`COALESCE(MAX(position), 0)` })
                    .from(experienceCollectionItemsTable)
                    .where(eq(experienceCollectionItemsTable.collectionId, collectionId));
                position = (maxPosition?.max || 0) + 1;
            }

            const [item] = await db
                .insert(experienceCollectionItemsTable)
                .values({
                    collectionId,
                    experienceId,
                    position
                })
                .returning();
            return item;
        });
    }

    async removeExperienceFromCollection(collectionId: number, experienceId: string) {
        return await this.withDatabase(async (db) => {
            await db
                .delete(experienceCollectionItemsTable)
                .where(and(
                    eq(experienceCollectionItemsTable.collectionId, collectionId),
                    eq(experienceCollectionItemsTable.experienceId, experienceId)
                ));
        });
    }

    async reorderCollectionItem(collectionId: number, experienceId: string, newPosition: number) {
        return await this.withDatabase(async (db) => {
            await db
                .update(experienceCollectionItemsTable)
                .set({ position: newPosition })
                .where(and(
                    eq(experienceCollectionItemsTable.collectionId, collectionId),
                    eq(experienceCollectionItemsTable.experienceId, experienceId)
                ));
        });
    }

    // Get Experiences by Collection
    async getExperiencesByCollection(
        collectionSlug: string, 
        options?: {
            limit?: number;
            offset?: number;
            latitude?: number;
            longitude?: number;
        }
    ) {
        return await this.withDatabase(async (db) => {
            // First get the collection
            const collection = await this.getCollectionBySlug(collectionSlug);
            if (!collection) {
                return [];
            }

            const metadata = collection.metadata as any || {};
            const limit = options?.limit || metadata.displayLimit || 10;

            // Check if this is a location-based collection
            if (metadata.requiresLocation && options?.latitude && options?.longitude) {
                return await this.getNearbyExperiences(
                    options.latitude,
                    options.longitude,
                    {
                        limit,
                        maxDistanceKm: metadata.maxDistanceKm || 50
                    }
                );
            }

            // Check if this is an algorithmic collection
            if (metadata.algorithm) {
                return await this.getAlgorithmicExperiences(
                    metadata.algorithm,
                    { 
                        limit,
                        filters: metadata.filters 
                    }
                );
            }

            // Otherwise, get manually curated experiences
            const query = db
                .select({
                    experience: experiencesTable,
                    position: experienceCollectionItemsTable.position,
                    addedAt: experienceCollectionItemsTable.addedAt
                })
                .from(experienceCollectionItemsTable)
                .innerJoin(
                    experiencesTable,
                    eq(experienceCollectionItemsTable.experienceId, experiencesTable.id)
                )
                .where(and(
                    eq(experienceCollectionItemsTable.collectionId, collection.id),
                    eq(experiencesTable.status, 'active'),
                    eq(experiencesTable.isPublic, true),
                    // Check for expired items
                    sql`${experienceCollectionItemsTable.expiresAt} IS NULL OR ${experienceCollectionItemsTable.expiresAt} > NOW()`
                ))
                .orderBy(asc(experienceCollectionItemsTable.position))
                .limit(limit);

            if (options?.offset) {
                query.offset(options.offset);
            }

            const results = await query;
            return results.map(r => r.experience);
        });
    }

    // Location-based queries
    private async getNearbyExperiences(
        latitude: number,
        longitude: number,
        options: {
            limit: number;
            maxDistanceKm: number;
        }
    ) {
        return await this.withDatabase(async (db) => {
            // Using PostGIS-style distance calculation
            const distanceFormula = sql`
                (6371 * acos(
                    cos(radians(${latitude})) * 
                    cos(radians(${experiencesTable.startingLocation}[1])) * 
                    cos(radians(${experiencesTable.startingLocation}[0]) - radians(${longitude})) + 
                    sin(radians(${latitude})) * 
                    sin(radians(${experiencesTable.startingLocation}[1]))
                ))
            `;

            const experiences = await db
                .select({
                    experience: experiencesTable,
                    distance: distanceFormula
                })
                .from(experiencesTable)
                .where(and(
                    eq(experiencesTable.status, 'active'),
                    eq(experiencesTable.isPublic, true),
                    sql`${distanceFormula} <= ${options.maxDistanceKm}`
                ))
                .orderBy(asc(sql`distance`))
                .limit(options.limit);

            return experiences.map(e => e.experience);
        });
    }

    // Algorithmic queries
    private async getAlgorithmicExperiences(
        algorithm: string,
        options: {
            limit: number;
            filters?: Record<string, any>;
        }
    ) {
        return await this.withDatabase(async (db) => {
            let query = db
                .select()
                .from(experiencesTable)
                .where(and(
                    eq(experiencesTable.status, 'active'),
                    eq(experiencesTable.isPublic, true)
                ));

            // Apply algorithm-specific ordering
            switch (algorithm) {
                case 'popularity':
                    // Order by booking count (would need to join with reservations)
                    query = query.orderBy(desc(experiencesTable.createdAt)); // Placeholder
                    break;
                case 'rating':
                    // Order by average rating (would need to join with reviews)
                    query = query.orderBy(desc(experiencesTable.createdAt)); // Placeholder
                    break;
                case 'recency':
                    query = query.orderBy(desc(experiencesTable.createdAt));
                    break;
                default:
                    query = query.orderBy(desc(experiencesTable.createdAt));
            }

            return await query.limit(options.limit);
        });
    }

    // Seed collections
    async seedCollections(collections: InsertExperienceCollection[]) {
        return await this.withDatabase(async (db) => {
            const results = [];
            for (const collection of collections) {
                const existing = await this.getCollectionBySlug(collection.slug);
                if (!existing) {
                    const [created] = await db
                        .insert(experienceCollectionsTable)
                        .values(collection)
                        .returning();
                    results.push({ ...created, status: 'created' });
                } else {
                    results.push({ ...existing, status: 'already_exists' });
                }
            }
            return results;
        });
    }
}

export type InsertExperienceCollection = InferInsertModel<typeof experienceCollectionsTable>;
export type InsertExperienceCollectionItem = InferInsertModel<typeof experienceCollectionItemsTable>;