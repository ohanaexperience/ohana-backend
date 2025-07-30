import {
    and,
    eq,
    desc,
    asc,
    sql,
    gte,
    lte,
    isNull,
    count,
    avg,
    InferInsertModel,
} from "drizzle-orm";
import { BaseQueryManager } from "./base";
import {
    reviewsTable,
    reviewImagesTable,
    reviewHelpfulVotesTable,
    usersTable,
    hostsTable,
    experiencesTable,
    reservationsTable,
} from "@/database/schemas";

type InsertReview = InferInsertModel<typeof reviewsTable>;
type InsertReviewImage = InferInsertModel<typeof reviewImagesTable>;
type InsertReviewHelpfulVote = InferInsertModel<typeof reviewHelpfulVotesTable>;

export interface CreateReviewData {
    reservationId: string;
    experienceId: string;
    userId: string;
    hostId: string;
    rating: number;
    title?: string;
    comment?: string;
}

export interface UpdateReviewData {
    rating?: number;
    title?: string;
    comment?: string;
}

export interface CreateReviewImageData {
    reviewId: string;
    imageUrl: string;
    sortOrder: number;
}

export interface ReviewFilters {
    experienceId?: string;
    userId?: string;
    hostId?: string;
    minRating?: number;
    maxRating?: number;
    isPublished?: boolean;
    hasHostResponse?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: "newest" | "oldest" | "highest" | "lowest" | "helpful";
}

export interface ReviewStats {
    experienceId: string;
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export class ReviewsQueryManager extends BaseQueryManager {
    // Create a new review
    public async create(data: CreateReviewData) {
        return await this.withDatabase(async (db) => {
            const [review] = await db
                .insert(reviewsTable)
                .values(data)
                .returning();

            return review;
        });
    }

    // Get review by ID with relations
    public async getById(reviewId: string) {
        return await this.withDatabase(async (db) => {
            const result = await db
                .select({
                    review: reviewsTable,
                    user: usersTable,
                    host: hostsTable,
                    experience: experiencesTable,
                    reservation: reservationsTable,
                })
                .from(reviewsTable)
                .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
                .leftJoin(hostsTable, eq(reviewsTable.hostId, hostsTable.id))
                .leftJoin(
                    experiencesTable,
                    eq(reviewsTable.experienceId, experiencesTable.id)
                )
                .leftJoin(
                    reservationsTable,
                    eq(reviewsTable.reservationId, reservationsTable.id)
                )
                .where(eq(reviewsTable.id, reviewId))
                .limit(1);

            if (!result.length) return null;

            // Get images
            const images = await db
                .select()
                .from(reviewImagesTable)
                .where(eq(reviewImagesTable.reviewId, reviewId))
                .orderBy(asc(reviewImagesTable.sortOrder));

            // Get helpful vote count
            const [helpfulStats] = await db
                .select({
                    count: count(),
                })
                .from(reviewHelpfulVotesTable)
                .where(eq(reviewHelpfulVotesTable.reviewId, reviewId));

            return {
                ...result[0].review,
                user: result[0].user,
                host: result[0].host,
                experience: result[0].experience,
                reservation: result[0].reservation,
                images,
                helpfulVotes: helpfulStats?.count || 0,
            };
        });
    }

    // Get review by reservation ID
    public async getByReservationId(reservationId: string) {
        return await this.withDatabase(async (db) => {
            const [review] = await db
                .select()
                .from(reviewsTable)
                .where(eq(reviewsTable.reservationId, reservationId))
                .limit(1);

            return review || null;
        });
    }

    // Update review
    public async update(reviewId: string, data: UpdateReviewData) {
        return await this.withDatabase(async (db) => {
            const [updated] = await db
                .update(reviewsTable)
                .set({
                    ...data,
                    updatedAt: new Date(),
                })
                .where(eq(reviewsTable.id, reviewId))
                .returning();

            return updated;
        });
    }

    // Add host response
    public async addHostResponse(reviewId: string, response: string) {
        return await this.withDatabase(async (db) => {
            const [updated] = await db
                .update(reviewsTable)
                .set({
                    hostResponse: response,
                    hostResponseAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(reviewsTable.id, reviewId))
                .returning();

            return updated;
        });
    }

    // Toggle publish status
    public async togglePublishStatus(reviewId: string, isPublished: boolean) {
        return await this.withDatabase(async (db) => {
            const [updated] = await db
                .update(reviewsTable)
                .set({
                    isPublished,
                    updatedAt: new Date(),
                })
                .where(eq(reviewsTable.id, reviewId))
                .returning();

            return updated;
        });
    }

    // Delete review
    public async delete(reviewId: string) {
        return await this.withDatabase(async (db) => {
            await db.delete(reviewsTable).where(eq(reviewsTable.id, reviewId));
        });
    }

    // Get reviews with filters
    public async getReviews(filters: ReviewFilters) {
        return await this.withDatabase(async (db) => {
            const conditions = [];

            if (filters.experienceId) {
                conditions.push(
                    eq(reviewsTable.experienceId, filters.experienceId)
                );
            }
            if (filters.userId) {
                conditions.push(eq(reviewsTable.userId, filters.userId));
            }
            if (filters.hostId) {
                conditions.push(eq(reviewsTable.hostId, filters.hostId));
            }
            if (filters.minRating !== undefined) {
                conditions.push(gte(reviewsTable.rating, filters.minRating));
            }
            if (filters.maxRating !== undefined) {
                conditions.push(lte(reviewsTable.rating, filters.maxRating));
            }
            if (filters.isPublished !== undefined) {
                conditions.push(
                    eq(reviewsTable.isPublished, filters.isPublished)
                );
            }
            if (filters.hasHostResponse === true) {
                conditions.push(sql`${reviewsTable.hostResponse} IS NOT NULL`);
            }
            if (filters.hasHostResponse === false) {
                conditions.push(isNull(reviewsTable.hostResponse));
            }

            let query = db
                .select({
                    review: reviewsTable,
                    user: usersTable,
                    helpfulVotes: sql<number>`COUNT(DISTINCT ${reviewHelpfulVotesTable.id})::int`,
                })
                .from(reviewsTable)
                .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
                .leftJoin(
                    reviewHelpfulVotesTable,
                    eq(reviewsTable.id, reviewHelpfulVotesTable.reviewId)
                )
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .groupBy(reviewsTable.id, usersTable.id);

            // Apply ordering
            switch (filters.orderBy) {
                case "oldest":
                    query = query.orderBy(asc(reviewsTable.createdAt));
                    break;
                case "highest":
                    query = query.orderBy(
                        desc(reviewsTable.rating),
                        desc(reviewsTable.createdAt)
                    );
                    break;
                case "lowest":
                    query = query.orderBy(
                        asc(reviewsTable.rating),
                        desc(reviewsTable.createdAt)
                    );
                    break;
                case "helpful":
                    query = query.orderBy(
                        desc(
                            sql`COUNT(DISTINCT ${reviewHelpfulVotesTable.id})`
                        ),
                        desc(reviewsTable.createdAt)
                    );
                    break;
                case "newest":
                default:
                    query = query.orderBy(desc(reviewsTable.createdAt));
            }

            // Apply pagination
            if (filters.limit) {
                query = query.limit(filters.limit);
            }
            if (filters.offset) {
                query = query.offset(filters.offset);
            }

            const results = await query;

            // Get images for each review
            const reviewsWithImages = await Promise.all(
                results.map(async (result) => {
                    const images = await db
                        .select()
                        .from(reviewImagesTable)
                        .where(eq(reviewImagesTable.reviewId, result.review.id))
                        .orderBy(asc(reviewImagesTable.sortOrder));

                    return {
                        ...result.review,
                        user: result.user,
                        images,
                        helpfulVotes: result.helpfulVotes || 0,
                    };
                })
            );

            return reviewsWithImages;
        });
    }

    // Get review statistics for an experience
    public async getExperienceStats(
        experienceId: string
    ): Promise<ReviewStats> {
        return await this.withDatabase(async (db) => {
            // Get overall stats
            const [stats] = await db
                .select({
                    totalReviews: count(),
                    averageRating: avg(reviewsTable.rating),
                })
                .from(reviewsTable)
                .where(
                    and(
                        eq(reviewsTable.experienceId, experienceId),
                        eq(reviewsTable.isPublished, true)
                    )
                );

            // Get rating distribution
            const distribution = await db
                .select({
                    rating: reviewsTable.rating,
                    count: count(),
                })
                .from(reviewsTable)
                .where(
                    and(
                        eq(reviewsTable.experienceId, experienceId),
                        eq(reviewsTable.isPublished, true)
                    )
                )
                .groupBy(reviewsTable.rating);

            const ratingDistribution = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
            };

            distribution.forEach((d) => {
                if (d.rating >= 1 && d.rating <= 5) {
                    ratingDistribution[d.rating as 1 | 2 | 3 | 4 | 5] = d.count;
                }
            });

            return {
                experienceId,
                averageRating: parseFloat(stats?.averageRating || "0"),
                totalReviews: stats?.totalReviews || 0,
                ratingDistribution,
            };
        });
    }

    // Update experience rating stats
    public async updateExperienceRatingStats(experienceId: string) {
        return await this.withDatabase(async (db) => {
            const stats = await this.getExperienceStats(experienceId);

            await db
                .update(experiencesTable)
                .set({
                    averageRating: Math.round(stats.averageRating),
                    totalReviews: stats.totalReviews,
                    updatedAt: new Date(),
                })
                .where(eq(experiencesTable.id, experienceId));
        });
    }

    // Add review image
    public async addImage(data: CreateReviewImageData) {
        return await this.withDatabase(async (db) => {
            const [image] = await db
                .insert(reviewImagesTable)
                .values(data)
                .returning();

            return image;
        });
    }

    // Delete review image
    public async deleteImage(imageId: string) {
        return await this.withDatabase(async (db) => {
            const [deleted] = await db
                .delete(reviewImagesTable)
                .where(eq(reviewImagesTable.id, imageId))
                .returning();

            return deleted;
        });
    }

    // Vote review as helpful
    public async voteHelpful(reviewId: string, userId: string) {
        return await this.withDatabase(async (db) => {
            try {
                const [vote] = await db
                    .insert(reviewHelpfulVotesTable)
                    .values({
                        reviewId,
                        userId,
                    })
                    .returning();

                return vote;
            } catch (error: any) {
                // Handle unique constraint violation
                if (error.code === "23505") {
                    return null;
                }
                throw error;
            }
        });
    }

    // Remove helpful vote
    public async removeHelpfulVote(reviewId: string, userId: string) {
        return await this.withDatabase(async (db) => {
            const [removed] = await db
                .delete(reviewHelpfulVotesTable)
                .where(
                    and(
                        eq(reviewHelpfulVotesTable.reviewId, reviewId),
                        eq(reviewHelpfulVotesTable.userId, userId)
                    )
                )
                .returning();

            return removed;
        });
    }

    // Check if user voted review as helpful
    public async hasUserVotedHelpful(reviewId: string, userId: string) {
        return await this.withDatabase(async (db) => {
            const [vote] = await db
                .select()
                .from(reviewHelpfulVotesTable)
                .where(
                    and(
                        eq(reviewHelpfulVotesTable.reviewId, reviewId),
                        eq(reviewHelpfulVotesTable.userId, userId)
                    )
                )
                .limit(1);

            return !!vote;
        });
    }
}
