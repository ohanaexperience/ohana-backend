import { REVIEW_STATUS, REVIEW_FLAG_REASONS } from "@/constants/reviews";

// Base review types
export type ReviewStatus = (typeof REVIEW_STATUS)[number];
export type ReviewFlagReason = (typeof REVIEW_FLAG_REASONS)[number];

// Review creation request
export interface CreateReviewRequest {
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
}

// Review update request (only for user's own reviews)
export interface UpdateReviewRequest {
    rating?: number;
    title?: string;
    comment?: string;
    valueForMoney?: number;
    communication?: number;
    accuracy?: number;
    location?: number;
    checkin?: number;
    cleanliness?: number;
}

// Host response request
export interface HostResponseRequest {
    hostResponse: string;
}

// Review flag request
export interface FlagReviewRequest {
    reason: ReviewFlagReason;
    additionalInfo?: string;
}

// Review with user and experience details
export interface ReviewWithDetails {
    id: string;
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
    status: ReviewStatus;
    hostResponse?: string;
    hostResponseAt?: Date;
    helpfulVotes: number;
    createdAt: Date;
    updatedAt: Date;
    
    // User details
    user: {
        id: string;
        firstName?: string;
        lastName?: string;
        profileImage?: {
            s3Key: string;
            originalName: string;
            mimeType: string;
            size: number;
            uploadedAt: Date;
        };
    };
    
    // Experience details (minimal for context)
    experience: {
        id: string;
        title: string;
        hostId: string;
    };
}

// Review statistics
export interface ReviewStats {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
    categoryAverages: {
        valueForMoney: number;
        communication: number;
        accuracy: number;
        location: number;
        checkin: number;
        cleanliness: number;
    };
}

// Review query filters
export interface ReviewFilters {
    experienceId?: string;
    userId?: string;
    hostId?: string;
    rating?: number;
    status?: ReviewStatus;
    minRating?: number;
    maxRating?: number;
    hasHostResponse?: boolean;
    sortBy?: "newest" | "oldest" | "highest_rated" | "lowest_rated" | "most_helpful";
    limit?: number;
    offset?: number;
}

// Helpful vote request
export interface HelpfulVoteRequest {
    isHelpful: boolean;
}