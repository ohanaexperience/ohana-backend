import Postgres from "@/database/postgres";

export interface CollectionServiceOptions {
    database: Postgres;
}

export class CollectionService {
    private readonly db: Postgres;

    constructor({ database }: CollectionServiceOptions) {
        this.db = database;
    }

    async getCollectionExperiences(
        slug: string,
        options?: {
            limit?: number;
            offset?: number;
            latitude?: number;
            longitude?: number;
        }
    ) {
        const experiences = await this.db.experienceCollections
            .getExperiencesByCollection(slug, options);
        
        // Enrich experiences with related data
        return await this.enrichExperiencesWithRelatedData(experiences);
    }

    async getAllCollections() {
        return await this.db.experienceCollections.getActiveCollections();
    }

    private async enrichExperiencesWithRelatedData(experiences: any[]) {
        const enrichedExperiences = await Promise.all(
            experiences.map(async (experience) => {
                const [includedItems, guestRequirements, category, subCategory] = 
                    await Promise.all([
                        this.db.experienceIncludedItems.getByExperienceId(experience.id),
                        this.db.experienceGuestRequirements.getByExperienceId(experience.id),
                        this.db.categories.getById(experience.categoryId),
                        this.db.subCategories.getById(experience.subCategoryId),
                    ]);

                return {
                    ...experience,
                    includedItems,
                    guestRequirements,
                    category,
                    subCategory,
                };
            })
        );

        return enrichedExperiences;
    }
}