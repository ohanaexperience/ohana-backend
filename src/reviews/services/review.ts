import Postgres from "@/database/postgres";
import ERRORS from "@/errors";

export interface CreateReviewInput {
    reservationId: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
}

export interface UpdateReviewInput {
    rating?: number;
    title?: string;
    comment?: string;
}

export class ReviewService {
    private db: Postgres;

    constructor(database: Postgres) {
        this.db = database;
    }

    /**
     * Create a new review
     */
    async createReview(userId: string, input: CreateReviewInput) {
        // Get reservation
        const reservation = await this.db.reservations.getById(
            input.reservationId
        );
        if (!reservation) {
            throw new Error(ERRORS.REVIEWS.RESERVATION.NOT_FOUND.CODE);
        }

        // Verify user owns the reservation
        if (reservation.userId !== userId) {
            throw new Error(ERRORS.REVIEWS.RESERVATION.NOT_OWNED_BY_USER.CODE);
        }

        // Check reservation is completed
        if (reservation.status !== "completed") {
            throw new Error(
                ERRORS.REVIEWS.REVIEW.ONLY_COMPLETED_EXPERIENCES.CODE
            );
        }

        // Check if review already exists
        const existingReview = await this.db.reviews.getByReservationId(
            input.reservationId
        );
        if (existingReview) {
            throw new Error(ERRORS.REVIEWS.REVIEW.ALREADY_EXISTS.CODE);
        }

        // Check if within review window (30 days)
        const completedDate = new Date(reservation.updatedAt);
        const daysSinceCompletion = Math.floor(
            (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCompletion > 30) {
            throw new Error(ERRORS.REVIEWS.REVIEW.OUTSIDE_WINDOW.CODE);
        }

        // Get experience and host details
        const experience = await this.db.experiences.getById(
            reservation.experienceId
        );
        if (!experience) {
            throw new Error(ERRORS.REVIEWS.EXPERIENCE.NOT_FOUND.CODE);
        }

        // Create the review
        const review = await this.db.reviews.create({
            reservationId: input.reservationId,
            experienceId: reservation.experienceId,
            userId: userId,
            hostId: experience.hostId,
            rating: input.rating,
            title: input.title,
            comment: input.comment,
        });

        // Add images if provided
        if (input.images && input.images.length > 0) {
            await Promise.all(
                input.images.map((imageUrl, index) =>
                    this.db.reviews.addImage({
                        reviewId: review.id,
                        imageUrl,
                        sortOrder: index,
                    })
                )
            );
        }

        // Update experience rating stats
        await this.db.reviews.updateExperienceRatingStats(
            reservation.experienceId
        );

        return review;
    }

    /**
     * Update an existing review
     */
    async updateReview(
        userId: string,
        reviewId: string,
        input: UpdateReviewInput
    ) {
        // Get review
        const review = await this.db.reviews.getById(reviewId);
        if (!review) {
            throw new Error(ERRORS.REVIEWS.REVIEW.NOT_FOUND.CODE);
        }

        // Verify user owns the review
        if (review.userId !== userId) {
            throw new Error(
                ERRORS.REVIEWS.PERMISSIONS.UPDATE_OWN_REVIEWS_ONLY.CODE
            );
        }

        // Don't allow updates if host has responded
        if (review.hostResponse) {
            throw new Error(
                ERRORS.REVIEWS.REVIEW.CANNOT_UPDATE_AFTER_HOST_RESPONSE.CODE
            );
        }

        // Update the review
        const updated = await this.db.reviews.update(reviewId, input);

        // Update experience rating stats if rating changed
        if (input.rating !== undefined) {
            await this.db.reviews.updateExperienceRatingStats(
                review.experienceId
            );
        }

        return updated;
    }

    /**
     * Delete a review
     */
    async deleteReview(userId: string, reviewId: string) {
        // Get review
        const review = await this.db.reviews.getById(reviewId);
        if (!review) {
            throw new Error(ERRORS.REVIEWS.REVIEW.NOT_FOUND.CODE);
        }

        // Verify user owns the review
        if (review.userId !== userId) {
            throw new Error(
                ERRORS.REVIEWS.PERMISSIONS.DELETE_OWN_REVIEWS_ONLY.CODE
            );
        }

        // Don't allow deletion if host has responded
        if (review.hostResponse) {
            throw new Error(
                ERRORS.REVIEWS.REVIEW.CANNOT_DELETE_AFTER_HOST_RESPONSE.CODE
            );
        }

        // Delete the review
        await this.db.reviews.delete(reviewId);

        // Update experience rating stats
        await this.db.reviews.updateExperienceRatingStats(review.experienceId);
    }

    /**
     * Add host response to a review
     */
    async addHostResponse(hostId: string, reviewId: string, response: string) {
        // Get review
        const review = await this.db.reviews.getById(reviewId);
        if (!review) {
            throw new Error(ERRORS.REVIEWS.REVIEW.NOT_FOUND.CODE);
        }

        // Verify host owns the experience
        const host = await this.db.hosts.getByUserId(hostId);
        if (!host || review.hostId !== hostId) {
            throw new Error(
                ERRORS.REVIEWS.HOST_RESPONSE.NOT_HOST_EXPERIENCE.CODE
            );
        }

        // Check if already responded
        if (review.hostResponse) {
            throw new Error(
                ERRORS.REVIEWS.HOST_RESPONSE.ALREADY_RESPONDED.CODE
            );
        }

        // Add response
        return await this.db.reviews.addHostResponse(reviewId, response);
    }

    /**
     * Vote a review as helpful
     */
    async voteHelpful(userId: string, reviewId: string) {
        // Get review
        const review = await this.db.reviews.getById(reviewId);
        if (!review) {
            throw new Error(ERRORS.REVIEWS.REVIEW.NOT_FOUND.CODE);
        }

        // Don't allow voting on own reviews
        if (review.userId === userId) {
            throw new Error(ERRORS.REVIEWS.REVIEW.CANNOT_VOTE_OWN_REVIEW.CODE);
        }

        // Vote as helpful
        const vote = await this.db.reviews.voteHelpful(reviewId, userId);
        if (!vote) {
            throw new Error(ERRORS.REVIEWS.REVIEW.ALREADY_VOTED_HELPFUL.CODE);
        }

        return vote;
    }

    /**
     * Remove helpful vote
     */
    async removeHelpfulVote(userId: string, reviewId: string) {
        const removed = await this.db.reviews.removeHelpfulVote(
            reviewId,
            userId
        );
        if (!removed) {
            throw new Error(ERRORS.REVIEWS.VOTE.NOT_FOUND.CODE);
        }
        return removed;
    }

    /**
     * Get reviews for an experience
     */
    async getExperienceReviews(
        experienceId: string,
        options: {
            limit?: number;
            offset?: number;
            orderBy?: "newest" | "oldest" | "highest" | "lowest" | "helpful";
            minRating?: number;
            userId?: string;
        }
    ) {
        return await this.db.reviews.getReviews({
            experienceId,
            isPublished: true,
            ...options,
        });
    }

    /**
     * Get review statistics for an experience
     */
    async getExperienceStats(experienceId: string) {
        return await this.db.reviews.getExperienceStats(experienceId);
    }

    /**
     * Get reviews by a user
     */
    async getUserReviews(
        userId: string,
        options: {
            limit?: number;
            offset?: number;
        }
    ) {
        return await this.db.reviews.getReviews({
            userId,
            orderBy: "newest",
            ...options,
        });
    }

    /**
     * Get reviews for a host's experiences
     */
    async getHostReviews(
        hostId: string,
        options: {
            experienceId?: string;
            limit?: number;
            offset?: number;
            orderBy?: "newest" | "oldest" | "highest" | "lowest" | "helpful";
            minRating?: number;
            hasHostResponse?: boolean;
            userId?: string;
        }
    ) {
        return await this.db.reviews.getReviews({
            hostId,
            experienceId: options.experienceId,
            orderBy: options.orderBy || "newest",
            limit: options.limit,
            offset: options.offset,
            minRating: options.minRating,
            hasHostResponse: options.hasHostResponse,
            isPublished: true, // Public endpoint should only show published reviews
        });
    }

    /**
     * Toggle review publication status (admin only)
     */
    async togglePublishStatus(reviewId: string, isPublished: boolean) {
        const review = await this.db.reviews.getById(reviewId);
        if (!review) {
            throw new Error(ERRORS.REVIEWS.REVIEW.NOT_FOUND.CODE);
        }

        const updated = await this.db.reviews.togglePublishStatus(
            reviewId,
            isPublished
        );

        // Update experience rating stats
        await this.db.reviews.updateExperienceRatingStats(review.experienceId);

        return updated;
    }

    /**
     * Get all reviews with filters (admin only)
     */
    async getAllReviews(filters: {
        isPublished?: boolean;
        minRating?: number;
        maxRating?: number;
        hasHostResponse?: boolean;
        limit?: number;
        offset?: number;
    }) {
        return await this.db.reviews.getReviews({
            orderBy: "newest",
            ...filters,
        });
    }

    /**
     * Check if a user has voted a review as helpful
     */
    async hasUserVotedHelpful(userId: string, reviewId: string) {
        return await this.db.reviews.hasUserVotedHelpful(reviewId, userId);
    }

    /**
     * Get review by ID
     */
    async getReviewById(reviewId: string) {
        return await this.db.reviews.getById(reviewId);
    }

    /**
     * Add image to review
     */
    async addReviewImage(data: { reviewId: string; imageUrl: string; sortOrder: number }) {
        return await this.db.reviews.addImage(data);
    }
}
