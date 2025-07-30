import { APIGatewayProxyResult } from "aws-lambda";
import { ReviewService } from "@/reviews/services/review";
import { S3Service } from "@/s3/services/s3";
import Postgres from "@/database/postgres";
import ERRORS from "@/errors";
import {
    CreateReviewRequest,
    UpdateReviewRequest,
    DeleteReviewRequest,
    VoteHelpfulRequest,
    RemoveHelpfulVoteRequest,
    GetMyReviewsRequest,
    RespondToReviewRequest,
    GetHostReviewsRequest,
    GetReviewImageUploadUrlRequest,
} from "@/reviews/validations";

export interface ReviewControllerOptions {
    database: Postgres;
    s3Service?: S3Service;
}

export class ReviewController {
    private readonly reviewService: ReviewService;
    private readonly s3Service?: S3Service;

    constructor(opts: ReviewControllerOptions) {
        this.reviewService = new ReviewService(opts.database);
        this.s3Service = opts.s3Service;
    }

    // User
    async createReview(
        request: CreateReviewRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            const { userId, ...reviewData } = request;

            const review = await this.reviewService.createReview(
                userId,
                reviewData
            );

            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "Review created successfully",
                    data: review,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateReview(
        request: UpdateReviewRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            const { userId, reviewId, ...reviewData } = request;

            const review = await this.reviewService.updateReview(
                userId,
                reviewId,
                reviewData
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Review updated successfully",
                    data: review,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteReview(
        request: DeleteReviewRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            const { userId, reviewId } = request;

            await this.reviewService.deleteReview(userId, reviewId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Review deleted successfully",
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async voteHelpful(
        request: VoteHelpfulRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            const { userId, reviewId } = request;

            const vote = await this.reviewService.voteHelpful(userId, reviewId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Vote recorded successfully",
                    data: vote,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async removeHelpfulVote(
        request: RemoveHelpfulVoteRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            const { userId, reviewId } = request;

            await this.reviewService.removeHelpfulVote(userId, reviewId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Vote removed successfully",
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getMyReviews(
        request: GetMyReviewsRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            const { userId, limit, offset } = request;

            const reviews = await this.reviewService.getUserReviews(userId, {
                limit: limit || 20,
                offset: offset || 0,
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    data: reviews,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Host
    async respondToReview(
        request: RespondToReviewRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            const { userId, reviewId, response } = request;

            const review = await this.reviewService.addHostResponse(
                userId,
                reviewId,
                response
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Response added successfully",
                    data: review,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getHostReviews(
        request: GetHostReviewsRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            const { userId, limit, offset, hasHostResponse } = request;

            const reviews = await this.reviewService.getHostReviews(userId, {
                limit: limit || 20,
                offset: offset || 0,
                hasHostResponse,
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    data: reviews,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Public
    async getExperienceReviews(
        experienceId: string,
        queryParams: any,
        userId?: string
    ): Promise<APIGatewayProxyResult> {
        try {
            const reviews = await this.reviewService.getExperienceReviews(
                experienceId,
                {
                    limit: queryParams?.limit || 20,
                    offset: queryParams?.offset || 0,
                    orderBy: queryParams?.orderBy || "newest",
                    minRating: queryParams?.minRating,
                    userId,
                }
            );

            // If user is authenticated, check which reviews they've voted helpful
            if (userId && reviews.length > 0) {
                const reviewsWithVoteStatus = await Promise.all(
                    reviews.map(async (review) => ({
                        ...review,
                        hasVotedHelpful:
                            await this.reviewService.hasUserVotedHelpful(
                                userId,
                                review.id
                            ),
                    }))
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        data: reviewsWithVoteStatus,
                    }),
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    data: reviews,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getReviewStats(experienceId: string): Promise<APIGatewayProxyResult> {
        try {
            const stats = await this.reviewService.getExperienceStats(
                experienceId
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    data: stats,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Admin: Moderate a review
     */
    async moderateReview(
        reviewId: string,
        body: any
    ): Promise<APIGatewayProxyResult> {
        try {
            const review = await this.reviewService.togglePublishStatus(
                reviewId,
                body.isPublished
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Review ${
                        body.isPublished ? "published" : "unpublished"
                    } successfully`,
                    data: review,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Admin: Get all reviews
     */
    async getAllReviews(queryParams: any): Promise<APIGatewayProxyResult> {
        try {
            const reviews = await this.reviewService.getAllReviews({
                limit: queryParams?.limit || 20,
                offset: queryParams?.offset || 0,
                isPublished: queryParams?.isPublished,
                hasHostResponse: queryParams?.hasHostResponse,
                minRating: queryParams?.minRating,
                maxRating: queryParams?.maxRating,
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    data: reviews,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Public: Get all reviews for a specific host
     */
    async getPublicHostReviews(
        hostId: string,
        queryParams: any,
        userId?: string
    ): Promise<APIGatewayProxyResult> {
        try {
            const reviews = await this.reviewService.getHostReviews(hostId, {
                experienceId: queryParams?.experienceId,
                limit: queryParams?.limit || 20,
                offset: queryParams?.offset || 0,
                orderBy: queryParams?.orderBy || "newest",
                minRating: queryParams?.minRating,
                userId,
            });

            // If user is authenticated, check which reviews they've voted helpful
            if (userId && reviews.length > 0) {
                const reviewsWithVoteStatus = await Promise.all(
                    reviews.map(async (review) => ({
                        ...review,
                        hasVotedHelpful:
                            await this.reviewService.hasUserVotedHelpful(
                                userId,
                                review.id
                            ),
                    }))
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        data: reviewsWithVoteStatus,
                    }),
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    data: reviews,
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: any): APIGatewayProxyResult {
        console.error("Review controller error:", error);

        switch (error.message) {
            // 404 Not Found errors
            case ERRORS.REVIEWS.REVIEW.NOT_FOUND.CODE:
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.REVIEW.NOT_FOUND.CODE,
                        message: ERRORS.REVIEWS.REVIEW.NOT_FOUND.MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.RESERVATION.NOT_FOUND.CODE:
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.RESERVATION.NOT_FOUND.CODE,
                        message: ERRORS.REVIEWS.RESERVATION.NOT_FOUND.MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.EXPERIENCE.NOT_FOUND.CODE:
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.EXPERIENCE.NOT_FOUND.CODE,
                        message: ERRORS.REVIEWS.EXPERIENCE.NOT_FOUND.MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.VOTE.NOT_FOUND.CODE:
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.VOTE.NOT_FOUND.CODE,
                        message: ERRORS.REVIEWS.VOTE.NOT_FOUND.MESSAGE,
                    }),
                };

            // 403 Forbidden errors
            case ERRORS.REVIEWS.RESERVATION.NOT_OWNED_BY_USER.CODE:
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.RESERVATION.NOT_OWNED_BY_USER
                            .CODE,
                        message:
                            ERRORS.REVIEWS.RESERVATION.NOT_OWNED_BY_USER
                                .MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.PERMISSIONS.UPDATE_OWN_REVIEWS_ONLY.CODE:
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.PERMISSIONS
                            .UPDATE_OWN_REVIEWS_ONLY.CODE,
                        message:
                            ERRORS.REVIEWS.PERMISSIONS.UPDATE_OWN_REVIEWS_ONLY
                                .MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.PERMISSIONS.DELETE_OWN_REVIEWS_ONLY.CODE:
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.PERMISSIONS
                            .DELETE_OWN_REVIEWS_ONLY.CODE,
                        message:
                            ERRORS.REVIEWS.PERMISSIONS.DELETE_OWN_REVIEWS_ONLY
                                .MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.HOST_RESPONSE.NOT_HOST_EXPERIENCE.CODE:
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.HOST_RESPONSE.NOT_HOST_EXPERIENCE
                            .CODE,
                        message:
                            ERRORS.REVIEWS.HOST_RESPONSE.NOT_HOST_EXPERIENCE
                                .MESSAGE,
                    }),
                };

            // 409 Conflict errors
            case ERRORS.REVIEWS.REVIEW.ALREADY_EXISTS.CODE:
                return {
                    statusCode: 409,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.REVIEW.ALREADY_EXISTS.CODE,
                        message: ERRORS.REVIEWS.REVIEW.ALREADY_EXISTS.MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.REVIEW.ALREADY_VOTED_HELPFUL.CODE:
                return {
                    statusCode: 409,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.REVIEW.ALREADY_VOTED_HELPFUL.CODE,
                        message:
                            ERRORS.REVIEWS.REVIEW.ALREADY_VOTED_HELPFUL.MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.HOST_RESPONSE.ALREADY_RESPONDED.CODE:
                return {
                    statusCode: 409,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.HOST_RESPONSE.ALREADY_RESPONDED
                            .CODE,
                        message:
                            ERRORS.REVIEWS.HOST_RESPONSE.ALREADY_RESPONDED
                                .MESSAGE,
                    }),
                };

            // 400 Bad Request errors
            case ERRORS.REVIEWS.REVIEW.ONLY_COMPLETED_EXPERIENCES.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.REVIEW.ONLY_COMPLETED_EXPERIENCES
                            .CODE,
                        message:
                            ERRORS.REVIEWS.REVIEW.ONLY_COMPLETED_EXPERIENCES
                                .MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.REVIEW.OUTSIDE_WINDOW.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.REVIEW.OUTSIDE_WINDOW.CODE,
                        message: ERRORS.REVIEWS.REVIEW.OUTSIDE_WINDOW.MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.REVIEW.CANNOT_UPDATE_AFTER_HOST_RESPONSE.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.REVIEW
                            .CANNOT_UPDATE_AFTER_HOST_RESPONSE.CODE,
                        message:
                            ERRORS.REVIEWS.REVIEW
                                .CANNOT_UPDATE_AFTER_HOST_RESPONSE.MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.REVIEW.CANNOT_DELETE_AFTER_HOST_RESPONSE.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.REVIEW
                            .CANNOT_DELETE_AFTER_HOST_RESPONSE.CODE,
                        message:
                            ERRORS.REVIEWS.REVIEW
                                .CANNOT_DELETE_AFTER_HOST_RESPONSE.MESSAGE,
                    }),
                };

            case ERRORS.REVIEWS.REVIEW.CANNOT_VOTE_OWN_REVIEW.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.REVIEWS.REVIEW.CANNOT_VOTE_OWN_REVIEW
                            .CODE,
                        message:
                            ERRORS.REVIEWS.REVIEW.CANNOT_VOTE_OWN_REVIEW
                                .MESSAGE,
                    }),
                };

            // Default error
            default:
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "INTERNAL_SERVER_ERROR",
                        message: "An unexpected error occurred",
                    }),
                };
        }
    }

    /**
     * Get review image upload URL
     */
    async getReviewImageUploadUrl(
        request: GetReviewImageUploadUrlRequest
    ): Promise<APIGatewayProxyResult> {
        try {
            if (!this.s3Service) {
                throw new Error("S3 service is required for image uploads");
            }

            const { userId, reviewId, mimeType, sortOrder = 0 } = request;

            // Get the review
            const review = await this.reviewService.getReviewById(reviewId);
            if (!review) {
                throw new Error(ERRORS.REVIEWS.REVIEW.NOT_FOUND.CODE);
            }

            // Verify user owns the review
            if (review.userId !== userId) {
                throw new Error(
                    ERRORS.REVIEWS.PERMISSIONS.UPDATE_OWN_REVIEWS_ONLY.CODE
                );
            }

            // Check if review already has max images (5)
            if (review.images && review.images.length >= 5) {
                throw new Error("REVIEW_MAX_IMAGES_EXCEEDED");
            }

            // Generate upload URL using S3Service
            const uploadData = await this.s3Service.getReviewImageUploadUrl({
                reviewId,
                mimeType,
            });

            // Add image record to database
            await this.reviewService.addReviewImage({
                reviewId,
                imageUrl: uploadData.publicUrl,
                sortOrder,
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Upload URL generated successfully",
                    data: {
                        uploadUrl: uploadData.uploadUrl,
                        imageUrl: uploadData.publicUrl,
                        imageId: uploadData.imageId,
                    },
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }
}
