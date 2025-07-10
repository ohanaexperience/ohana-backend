import { and, eq, desc, asc, sql, gte, lte, count, avg, sum } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
    reviewsTable,
    reviewHelpfulVotesTable,
    experienceReviewStatsTable,
    usersTable,
    experiencesTable,
    reservationsTable,
} from "@/database/schemas";
import { ReviewFilters, ReviewWithDetails, ReviewStats } from "@/types/reviews";

export class ReviewsQueryManager {
    constructor(private db: PostgresJsDatabase<Record<string, never>>) {}

    async createReview(data: {
        userId: string;
        experienceId: string;
        reservationId: string;
        rating: number;
        title: string;
        comment: string;
        valueForMoney?: number;
        communication?: number;
        accuracy?: number;
        location?: number;
        checkin?: number;
        cleanliness?: number;
    }) {
        const [review] = await this.db
            .insert(reviewsTable)
            .values(data)
            .returning();
        return review;
    }

    async getReviewById(reviewId: string) {
        const [review] = await this.db
            .select()
            .from(reviewsTable)
            .where(eq(reviewsTable.id, reviewId));
        return review;
    }

    async getReviewWithDetails(reviewId: string): Promise<ReviewWithDetails | null> {
        const [result] = await this.db
            .select({
                // Review fields
                id: reviewsTable.id,
                userId: reviewsTable.userId,
                experienceId: reviewsTable.experienceId,
                reservationId: reviewsTable.reservationId,
                rating: reviewsTable.rating,
                title: reviewsTable.title,
                comment: reviewsTable.comment,
                valueForMoney: reviewsTable.valueForMoney,
                communication: reviewsTable.communication,
                accuracy: reviewsTable.accuracy,
                location: reviewsTable.location,
                checkin: reviewsTable.checkin,
                cleanliness: reviewsTable.cleanliness,
                status: reviewsTable.status,
                hostResponse: reviewsTable.hostResponse,
                hostResponseAt: reviewsTable.hostResponseAt,
                helpfulVotes: reviewsTable.helpfulVotes,
                createdAt: reviewsTable.createdAt,
                updatedAt: reviewsTable.updatedAt,
                
                // User fields
                userFirstName: usersTable.firstName,
                userLastName: usersTable.lastName,
                userProfileImage: usersTable.profileImage,
                
                // Experience fields
                experienceTitle: experiencesTable.title,
                experienceHostId: experiencesTable.hostId,
            })
            .from(reviewsTable)
            .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
            .leftJoin(experiencesTable, eq(reviewsTable.experienceId, experiencesTable.id))
            .where(eq(reviewsTable.id, reviewId));

        if (!result) return null;

        return {
            id: result.id,
            userId: result.userId,
            experienceId: result.experienceId,
            reservationId: result.reservationId,
            rating: result.rating,
            title: result.title,
            comment: result.comment,
            valueForMoney: result.valueForMoney || undefined,
            communication: result.communication || undefined,
            accuracy: result.accuracy || undefined,
            location: result.location || undefined,
            checkin: result.checkin || undefined,
            cleanliness: result.cleanliness || undefined,
            status: result.status as any,
            hostResponse: result.hostResponse || undefined,
            hostResponseAt: result.hostResponseAt || undefined,
            helpfulVotes: result.helpfulVotes,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            user: {
                id: result.userId,
                firstName: result.userFirstName || undefined,
                lastName: result.userLastName || undefined,
                profileImage: result.userProfileImage || undefined,
            },
            experience: {
                id: result.experienceId,
                title: result.experienceTitle,
                hostId: result.experienceHostId,
            },
        };
    }

    async getReviews(filters: ReviewFilters = {}) {
        let query = this.db
            .select({
                // Review fields
                id: reviewsTable.id,
                userId: reviewsTable.userId,
                experienceId: reviewsTable.experienceId,
                reservationId: reviewsTable.reservationId,
                rating: reviewsTable.rating,
                title: reviewsTable.title,
                comment: reviewsTable.comment,
                valueForMoney: reviewsTable.valueForMoney,
                communication: reviewsTable.communication,
                accuracy: reviewsTable.accuracy,
                location: reviewsTable.location,
                checkin: reviewsTable.checkin,
                cleanliness: reviewsTable.cleanliness,
                status: reviewsTable.status,
                hostResponse: reviewsTable.hostResponse,
                hostResponseAt: reviewsTable.hostResponseAt,
                helpfulVotes: reviewsTable.helpfulVotes,
                createdAt: reviewsTable.createdAt,
                updatedAt: reviewsTable.updatedAt,
                
                // User fields
                userFirstName: usersTable.firstName,
                userLastName: usersTable.lastName,
                userProfileImage: usersTable.profileImage,
                
                // Experience fields
                experienceTitle: experiencesTable.title,
                experienceHostId: experiencesTable.hostId,
            })
            .from(reviewsTable)
            .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
            .leftJoin(experiencesTable, eq(reviewsTable.experienceId, experiencesTable.id));

        // Apply filters
        const conditions = [];
        
        if (filters.experienceId) {
            conditions.push(eq(reviewsTable.experienceId, filters.experienceId));
        }
        
        if (filters.userId) {
            conditions.push(eq(reviewsTable.userId, filters.userId));
        }
        
        if (filters.hostId) {
            conditions.push(eq(experiencesTable.hostId, filters.hostId));
        }
        
        if (filters.rating) {
            conditions.push(eq(reviewsTable.rating, filters.rating));
        }
        
        if (filters.status) {
            conditions.push(eq(reviewsTable.status, filters.status));
        }
        
        if (filters.minRating) {
            conditions.push(gte(reviewsTable.rating, filters.minRating));
        }
        
        if (filters.maxRating) {
            conditions.push(lte(reviewsTable.rating, filters.maxRating));
        }
        
        if (filters.hasHostResponse !== undefined) {
            if (filters.hasHostResponse) {
                conditions.push(sql`${reviewsTable.hostResponse} IS NOT NULL`);
            } else {
                conditions.push(sql`${reviewsTable.hostResponse} IS NULL`);
            }
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // Apply sorting
        switch (filters.sortBy) {
            case "oldest":
                query = query.orderBy(asc(reviewsTable.createdAt));
                break;
            case "highest_rated":
                query = query.orderBy(desc(reviewsTable.rating), desc(reviewsTable.createdAt));
                break;
            case "lowest_rated":
                query = query.orderBy(asc(reviewsTable.rating), desc(reviewsTable.createdAt));
                break;
            case "most_helpful":
                query = query.orderBy(desc(reviewsTable.helpfulVotes), desc(reviewsTable.createdAt));
                break;
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

        return results.map((result): ReviewWithDetails => ({
            id: result.id,
            userId: result.userId,
            experienceId: result.experienceId,
            reservationId: result.reservationId,
            rating: result.rating,
            title: result.title,
            comment: result.comment,
            valueForMoney: result.valueForMoney || undefined,
            communication: result.communication || undefined,
            accuracy: result.accuracy || undefined,
            location: result.location || undefined,
            checkin: result.checkin || undefined,
            cleanliness: result.cleanliness || undefined,
            status: result.status as any,
            hostResponse: result.hostResponse || undefined,
            hostResponseAt: result.hostResponseAt || undefined,
            helpfulVotes: result.helpfulVotes,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            user: {
                id: result.userId,
                firstName: result.userFirstName || undefined,
                lastName: result.userLastName || undefined,
                profileImage: result.userProfileImage || undefined,
            },
            experience: {
                id: result.experienceId,
                title: result.experienceTitle,
                hostId: result.experienceHostId,
            },
        }));
    }

    async updateReview(reviewId: string, data: {
        rating?: number;
        title?: string;
        comment?: string;
        valueForMoney?: number;
        communication?: number;
        accuracy?: number;
        location?: number;
        checkin?: number;
        cleanliness?: number;
    }) {
        const [review] = await this.db
            .update(reviewsTable)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(reviewsTable.id, reviewId))
            .returning();
        return review;
    }

    async addHostResponse(reviewId: string, hostResponse: string) {
        const [review] = await this.db
            .update(reviewsTable)
            .set({
                hostResponse,
                hostResponseAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(reviewsTable.id, reviewId))
            .returning();
        return review;
    }

    async deleteReview(reviewId: string) {
        await this.db
            .delete(reviewsTable)
            .where(eq(reviewsTable.id, reviewId));
    }

    async flagReview(reviewId: string, reason: string, moderatedBy?: string) {
        const [review] = await this.db
            .update(reviewsTable)
            .set({
                status: "flagged",
                flaggedReason: reason,
                moderatedAt: new Date(),
                moderatedBy,
                updatedAt: new Date(),
            })
            .where(eq(reviewsTable.id, reviewId))
            .returning();
        return review;
    }

    async getReviewByReservation(reservationId: string) {
        const [review] = await this.db
            .select()
            .from(reviewsTable)
            .where(eq(reviewsTable.reservationId, reservationId));
        return review;
    }

    async recordHelpfulVote(reviewId: string, userId: string, isHelpful: boolean) {
        // First check if vote already exists
        const [existingVote] = await this.db
            .select()
            .from(reviewHelpfulVotesTable)
            .where(
                and(
                    eq(reviewHelpfulVotesTable.reviewId, reviewId),
                    eq(reviewHelpfulVotesTable.userId, userId)
                )
            );

        if (existingVote) {
            // Update existing vote
            await this.db
                .update(reviewHelpfulVotesTable)
                .set({ isHelpful })
                .where(eq(reviewHelpfulVotesTable.id, existingVote.id));
        } else {
            // Create new vote
            await this.db
                .insert(reviewHelpfulVotesTable)
                .values({
                    reviewId,
                    userId,
                    isHelpful,
                });
        }

        // Update helpful votes count on review
        const helpfulCount = await this.db
            .select({ count: count() })
            .from(reviewHelpfulVotesTable)
            .where(
                and(
                    eq(reviewHelpfulVotesTable.reviewId, reviewId),
                    eq(reviewHelpfulVotesTable.isHelpful, true)
                )
            );

        await this.db
            .update(reviewsTable)
            .set({ helpfulVotes: helpfulCount[0].count })
            .where(eq(reviewsTable.id, reviewId));
    }

    async getExperienceReviewStats(experienceId: string): Promise<ReviewStats | null> {
        const [stats] = await this.db
            .select()
            .from(experienceReviewStatsTable)
            .where(eq(experienceReviewStatsTable.experienceId, experienceId));

        if (!stats) return null;

        return {
            totalReviews: stats.totalReviews,
            averageRating: stats.averageRating / 100, // Convert back from stored integer
            ratingDistribution: {
                5: stats.fiveStarCount,
                4: stats.fourStarCount,
                3: stats.threeStarCount,
                2: stats.twoStarCount,
                1: stats.oneStarCount,
            },
            categoryAverages: {
                valueForMoney: stats.avgValueForMoney / 100,
                communication: stats.avgCommunication / 100,
                accuracy: stats.avgAccuracy / 100,
                location: stats.avgLocation / 100,
                checkin: stats.avgCheckin / 100,
                cleanliness: stats.avgCleanliness / 100,
            },
        };
    }

    async updateExperienceReviewStats(experienceId: string) {
        // Calculate all stats from reviews
        const reviewStats = await this.db
            .select({
                totalReviews: count(),
                avgRating: avg(reviewsTable.rating),
                avgValueForMoney: avg(reviewsTable.valueForMoney),
                avgCommunication: avg(reviewsTable.communication),
                avgAccuracy: avg(reviewsTable.accuracy),
                avgLocation: avg(reviewsTable.location),
                avgCheckin: avg(reviewsTable.checkin),
                avgCleanliness: avg(reviewsTable.cleanliness),
            })
            .from(reviewsTable)
            .where(
                and(
                    eq(reviewsTable.experienceId, experienceId),
                    eq(reviewsTable.status, "active")
                )
            );

        const ratingDistribution = await this.db
            .select({
                rating: reviewsTable.rating,
                count: count(),
            })
            .from(reviewsTable)
            .where(
                and(
                    eq(reviewsTable.experienceId, experienceId),
                    eq(reviewsTable.status, "active")
                )
            )
            .groupBy(reviewsTable.rating);

        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingDistribution.forEach((r) => {
            dist[r.rating as keyof typeof dist] = r.count;
        });

        const stats = reviewStats[0];
        const statsData = {
            experienceId,
            totalReviews: stats.totalReviews,
            averageRating: Math.round((parseFloat(stats.avgRating || "0")) * 100),
            fiveStarCount: dist[5],
            fourStarCount: dist[4],
            threeStarCount: dist[3],
            twoStarCount: dist[2],
            oneStarCount: dist[1],
            avgValueForMoney: Math.round((parseFloat(stats.avgValueForMoney || "0")) * 100),
            avgCommunication: Math.round((parseFloat(stats.avgCommunication || "0")) * 100),
            avgAccuracy: Math.round((parseFloat(stats.avgAccuracy || "0")) * 100),
            avgLocation: Math.round((parseFloat(stats.avgLocation || "0")) * 100),
            avgCheckin: Math.round((parseFloat(stats.avgCheckin || "0")) * 100),
            avgCleanliness: Math.round((parseFloat(stats.avgCleanliness || "0")) * 100),
            lastUpdated: new Date(),
        };

        // Upsert stats record
        await this.db
            .insert(experienceReviewStatsTable)
            .values(statsData)
            .onConflictDoUpdate({
                target: experienceReviewStatsTable.experienceId,
                set: statsData,
            });
    }
}