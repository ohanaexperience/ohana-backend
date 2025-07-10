import { z } from "zod";
import { MIN_RATING, MAX_RATING, MIN_TITLE_LENGTH, MAX_TITLE_LENGTH, MIN_COMMENT_LENGTH, MAX_COMMENT_LENGTH, REVIEW_FLAG_REASONS } from "@/constants/reviews";

export const createReviewSchema = z.object({
    reservationId: z.string().uuid(),
    rating: z.number().min(MIN_RATING).max(MAX_RATING),
    title: z.string().min(MIN_TITLE_LENGTH).max(MAX_TITLE_LENGTH),
    comment: z.string().min(MIN_COMMENT_LENGTH).max(MAX_COMMENT_LENGTH),
    valueForMoney: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    communication: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    accuracy: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    location: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    checkin: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    cleanliness: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
});

export const updateReviewSchema = z.object({
    rating: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    title: z.string().min(MIN_TITLE_LENGTH).max(MAX_TITLE_LENGTH).optional(),
    comment: z.string().min(MIN_COMMENT_LENGTH).max(MAX_COMMENT_LENGTH).optional(),
    valueForMoney: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    communication: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    accuracy: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    location: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    checkin: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
    cleanliness: z.number().min(MIN_RATING).max(MAX_RATING).optional(),
});

export const hostResponseSchema = z.object({
    hostResponse: z.string().min(1).max(1000),
});

export const flagReviewSchema = z.object({
    reason: z.enum(REVIEW_FLAG_REASONS),
    additionalInfo: z.string().max(500).optional(),
});

export const helpfulVoteSchema = z.object({
    isHelpful: z.boolean(),
});