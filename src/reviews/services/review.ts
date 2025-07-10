import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";

import { ReviewsQueryManager } from "@/database/postgres/query_managers/reviews";
import { reservationsTable, experiencesTable, experienceTimeSlotsTable } from "@/database/schemas";
import {
    CreateReviewRequest,
    UpdateReviewRequest,
    HostResponseRequest,
    FlagReviewRequest,
    ReviewFilters,
    HelpfulVoteRequest,
} from "@/types/reviews";
import {
    MIN_RATING,
    MAX_RATING,
    MIN_TITLE_LENGTH,
    MAX_TITLE_LENGTH,
    MIN_COMMENT_LENGTH,
    MAX_COMMENT_LENGTH,
    MAX_HOST_RESPONSE_LENGTH,
    MIN_HOURS_AFTER_EXPERIENCE,
    MAX_DAYS_AFTER_EXPERIENCE,
} from "@/constants/reviews";

export interface ReviewServiceOptions {
    database: PostgresJsDatabase<Record<string, never>>;
}

export class ReviewService {
    private reviewsManager: ReviewsQueryManager;

    constructor(private options: ReviewServiceOptions) {
        this.reviewsManager = new ReviewsQueryManager(options.database);
    }

    async createReview(userId: string, request: CreateReviewRequest) {
        // Validate rating
        if (request.rating < MIN_RATING || request.rating > MAX_RATING) {
            throw new Error(`Rating must be between ${MIN_RATING} and ${MAX_RATING}`);
        }

        // Validate text lengths
        if (request.title.length < MIN_TITLE_LENGTH || request.title.length > MAX_TITLE_LENGTH) {
            throw new Error(`Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`);
        }

        if (request.comment.length < MIN_COMMENT_LENGTH || request.comment.length > MAX_COMMENT_LENGTH) {
            throw new Error(`Comment must be between ${MIN_COMMENT_LENGTH} and ${MAX_COMMENT_LENGTH} characters`);
        }

        // Validate category ratings if provided
        const categoryRatings = [
            request.valueForMoney,
            request.communication,
            request.accuracy,
            request.location,
            request.checkin,
            request.cleanliness,
        ].filter(r => r !== undefined);

        for (const rating of categoryRatings) {
            if (rating && (rating < MIN_RATING || rating > MAX_RATING)) {
                throw new Error(`Category ratings must be between ${MIN_RATING} and ${MAX_RATING}`);
            }
        }

        // Get reservation details to validate user can review this experience
        const [reservation] = await this.options.database
            .select({
                id: reservationsTable.id,
                userId: reservationsTable.userId,
                experienceId: reservationsTable.experienceId,
                status: reservationsTable.status,
                timeSlotId: reservationsTable.timeSlotId,
            })
            .from(reservationsTable)
            .where(eq(reservationsTable.id, request.reservationId));

        if (!reservation) {
            throw new Error("Reservation not found");
        }

        if (reservation.userId !== userId) {
            throw new Error("You can only review experiences you have booked");
        }

        if (reservation.status !== "completed") {
            throw new Error("You can only review completed experiences");
        }

        // Check if review already exists for this reservation
        const existingReview = await this.reviewsManager.getReviewByReservation(request.reservationId);
        if (existingReview) {
            throw new Error("You have already reviewed this experience");
        }

        // Get time slot details to validate timing
        const [timeSlot] = await this.options.database
            .select({
                slotDateTime: experienceTimeSlotsTable.slotDateTime,
            })
            .from(experienceTimeSlotsTable)
            .where(eq(experienceTimeSlotsTable.id, reservation.timeSlotId));

        if (!timeSlot) {
            throw new Error("Experience time slot not found");
        }

        // Check timing constraints
        const now = new Date();
        const experienceTime = new Date(timeSlot.slotDateTime);
        const hoursAfterExperience = (now.getTime() - experienceTime.getTime()) / (1000 * 60 * 60);
        const daysAfterExperience = hoursAfterExperience / 24;

        if (hoursAfterExperience < MIN_HOURS_AFTER_EXPERIENCE) {
            throw new Error(`You can only review an experience ${MIN_HOURS_AFTER_EXPERIENCE} hours after completion`);
        }

        if (daysAfterExperience > MAX_DAYS_AFTER_EXPERIENCE) {
            throw new Error(`Reviews must be submitted within ${MAX_DAYS_AFTER_EXPERIENCE} days of the experience`);
        }

        // Create the review
        const review = await this.reviewsManager.createReview({
            userId,
            experienceId: reservation.experienceId,
            reservationId: request.reservationId,
            rating: request.rating,
            title: request.title.trim(),
            comment: request.comment.trim(),
            valueForMoney: request.valueForMoney,
            communication: request.communication,
            accuracy: request.accuracy,
            location: request.location,
            checkin: request.checkin,
            cleanliness: request.cleanliness,
        });

        // Update experience review stats
        await this.reviewsManager.updateExperienceReviewStats(reservation.experienceId);

        return review;
    }

    async getReview(reviewId: string) {
        const review = await this.reviewsManager.getReviewWithDetails(reviewId);
        if (!review) {
            throw new Error("Review not found");
        }
        return review;
    }

    async getReviews(filters: ReviewFilters) {
        return this.reviewsManager.getReviews(filters);
    }

    async updateReview(userId: string, reviewId: string, request: UpdateReviewRequest) {
        const review = await this.reviewsManager.getReviewById(reviewId);
        if (!review) {
            throw new Error("Review not found");
        }

        if (review.userId !== userId) {
            throw new Error("You can only update your own reviews");
        }

        if (review.status !== "active") {
            throw new Error("Cannot update flagged or removed reviews");
        }

        // Validate updated fields
        if (request.rating !== undefined && (request.rating < MIN_RATING || request.rating > MAX_RATING)) {
            throw new Error(`Rating must be between ${MIN_RATING} and ${MAX_RATING}`);
        }

        if (request.title !== undefined && (request.title.length < MIN_TITLE_LENGTH || request.title.length > MAX_TITLE_LENGTH)) {
            throw new Error(`Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`);
        }

        if (request.comment !== undefined && (request.comment.length < MIN_COMMENT_LENGTH || request.comment.length > MAX_COMMENT_LENGTH)) {
            throw new Error(`Comment must be between ${MIN_COMMENT_LENGTH} and ${MAX_COMMENT_LENGTH} characters`);
        }

        const updateData: any = {};
        if (request.rating !== undefined) updateData.rating = request.rating;
        if (request.title !== undefined) updateData.title = request.title.trim();
        if (request.comment !== undefined) updateData.comment = request.comment.trim();
        if (request.valueForMoney !== undefined) updateData.valueForMoney = request.valueForMoney;
        if (request.communication !== undefined) updateData.communication = request.communication;
        if (request.accuracy !== undefined) updateData.accuracy = request.accuracy;
        if (request.location !== undefined) updateData.location = request.location;
        if (request.checkin !== undefined) updateData.checkin = request.checkin;
        if (request.cleanliness !== undefined) updateData.cleanliness = request.cleanliness;

        const updatedReview = await this.reviewsManager.updateReview(reviewId, updateData);

        // Update experience review stats if rating changed
        if (request.rating !== undefined) {
            await this.reviewsManager.updateExperienceReviewStats(review.experienceId);
        }

        return updatedReview;
    }

    async deleteReview(userId: string, reviewId: string) {
        const review = await this.reviewsManager.getReviewById(reviewId);
        if (!review) {
            throw new Error("Review not found");
        }

        if (review.userId !== userId) {
            throw new Error("You can only delete your own reviews");
        }

        await this.reviewsManager.deleteReview(reviewId);

        // Update experience review stats
        await this.reviewsManager.updateExperienceReviewStats(review.experienceId);
    }

    async addHostResponse(hostId: string, reviewId: string, request: HostResponseRequest) {
        if (request.hostResponse.length > MAX_HOST_RESPONSE_LENGTH) {
            throw new Error(`Host response must be ${MAX_HOST_RESPONSE_LENGTH} characters or less`);
        }

        const review = await this.reviewsManager.getReviewWithDetails(reviewId);
        if (!review) {
            throw new Error("Review not found");
        }

        if (review.experience.hostId !== hostId) {
            throw new Error("You can only respond to reviews of your own experiences");
        }

        if (review.status !== "active") {
            throw new Error("Cannot respond to flagged or removed reviews");
        }

        return this.reviewsManager.addHostResponse(reviewId, request.hostResponse.trim());
    }

    async flagReview(userId: string, reviewId: string, request: FlagReviewRequest) {
        const review = await this.reviewsManager.getReviewById(reviewId);
        if (!review) {
            throw new Error("Review not found");
        }

        if (review.userId === userId) {
            throw new Error("You cannot flag your own review");
        }

        const flagReason = request.additionalInfo 
            ? `${request.reason}: ${request.additionalInfo}` 
            : request.reason;

        return this.reviewsManager.flagReview(reviewId, flagReason, userId);
    }

    async recordHelpfulVote(userId: string, reviewId: string, request: HelpfulVoteRequest) {
        const review = await this.reviewsManager.getReviewById(reviewId);
        if (!review) {
            throw new Error("Review not found");
        }

        if (review.userId === userId) {
            throw new Error("You cannot vote on your own review");
        }

        if (review.status !== "active") {
            throw new Error("Cannot vote on flagged or removed reviews");
        }

        await this.reviewsManager.recordHelpfulVote(reviewId, userId, request.isHelpful);
    }

    async getExperienceReviewStats(experienceId: string) {
        return this.reviewsManager.getExperienceReviewStats(experienceId);
    }

    async getUserEligibleReservations(userId: string) {
        // Get completed reservations that haven't been reviewed yet and are within review window
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - MAX_DAYS_AFTER_EXPERIENCE);

        const reservations = await this.options.database
            .select({
                id: reservationsTable.id,
                experienceId: reservationsTable.experienceId,
                timeSlotId: reservationsTable.timeSlotId,
                experienceTitle: experiencesTable.title,
                slotDateTime: experienceTimeSlotsTable.slotDateTime,
            })
            .from(reservationsTable)
            .leftJoin(experiencesTable, eq(reservationsTable.experienceId, experiencesTable.id))
            .leftJoin(experienceTimeSlotsTable, eq(reservationsTable.timeSlotId, experienceTimeSlotsTable.id))
            .where(
                and(
                    eq(reservationsTable.userId, userId),
                    eq(reservationsTable.status, "completed")
                )
            );

        const eligibleReservations = [];
        
        for (const reservation of reservations) {
            // Check if already reviewed
            const existingReview = await this.reviewsManager.getReviewByReservation(reservation.id);
            if (existingReview) continue;

            // Check timing window
            const now = new Date();
            const experienceTime = new Date(reservation.slotDateTime);
            const hoursAfterExperience = (now.getTime() - experienceTime.getTime()) / (1000 * 60 * 60);
            const daysAfterExperience = hoursAfterExperience / 24;

            if (hoursAfterExperience >= MIN_HOURS_AFTER_EXPERIENCE && daysAfterExperience <= MAX_DAYS_AFTER_EXPERIENCE) {
                eligibleReservations.push({
                    reservationId: reservation.id,
                    experienceId: reservation.experienceId,
                    experienceTitle: reservation.experienceTitle,
                    experienceDate: reservation.slotDateTime,
                });
            }
        }

        return eligibleReservations;
    }
}