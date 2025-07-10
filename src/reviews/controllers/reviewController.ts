import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

import { ReviewService } from "@/reviews/services/review";
import {
    createReviewSchema,
    updateReviewSchema,
    hostResponseSchema,
    flagReviewSchema,
    helpfulVoteSchema,
} from "@/reviews/validation/reviewValidation";
import { performSecurityChecks, getSecurityHeaders } from "@/reviews/middleware/reviewSecurity";

export interface ReviewControllerOptions {
    database: PostgresJsDatabase<Record<string, never>>;
}

export class ReviewController {
    private reviewService: ReviewService;

    constructor(private options: ReviewControllerOptions) {
        this.reviewService = new ReviewService({
            database: options.database,
        });
    }

    async createReview(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const userId = event.requestContext.authorizer?.sub;
            if (!userId) {
                return {
                    statusCode: 401,
                    headers: getSecurityHeaders(),
                    body: JSON.stringify({ error: "Unauthorized" }),
                };
            }

            const body = JSON.parse(event.body || "{}");
            const validatedData = createReviewSchema.parse(body);

            // Perform security checks
            const securityCheck = performSecurityChecks(
                event,
                userId,
                'CREATE_REVIEW',
                `${validatedData.title} ${validatedData.comment}`
            );

            if (!securityCheck.passed) {
                return {
                    statusCode: securityCheck.statusCode || 400,
                    headers: getSecurityHeaders(),
                    body: JSON.stringify({ error: securityCheck.error }),
                };
            }

            const review = await this.reviewService.createReview(userId, validatedData);

            return {
                statusCode: 201,
                headers: getSecurityHeaders(),
                body: JSON.stringify({
                    success: true,
                    data: review,
                }),
            };
        } catch (error) {
            console.error("Error creating review:", error);
            
            if (error instanceof z.ZodError) {
                return {
                    statusCode: 400,
                    headers: getSecurityHeaders(),
                    body: JSON.stringify({
                        error: "Validation error",
                        details: error.errors,
                    }),
                };
            }

            return {
                statusCode: 400,
                headers: getSecurityHeaders(),
                body: JSON.stringify({ 
                    error: error instanceof Error ? error.message : "Failed to create review" 
                }),
            };
        }
    }

    async getReview(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const reviewId = event.pathParameters?.reviewId;
            if (!reviewId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Review ID is required" }),
                };
            }

            const review = await this.reviewService.getReview(reviewId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: review,
                }),
            };
        } catch (error) {
            console.error("Error getting review:", error);
            
            return {
                statusCode: 404,
                body: JSON.stringify({ 
                    error: error instanceof Error ? error.message : "Review not found" 
                }),
            };
        }
    }

    async getReviews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const query = event.queryStringParameters || {};
            
            const filters = {
                experienceId: query.experienceId,
                userId: query.userId,
                hostId: query.hostId,
                rating: query.rating ? parseInt(query.rating) : undefined,
                status: query.status as any,
                minRating: query.minRating ? parseInt(query.minRating) : undefined,
                maxRating: query.maxRating ? parseInt(query.maxRating) : undefined,
                hasHostResponse: query.hasHostResponse === "true" ? true : query.hasHostResponse === "false" ? false : undefined,
                sortBy: query.sortBy as any,
                limit: query.limit ? parseInt(query.limit) : 20,
                offset: query.offset ? parseInt(query.offset) : 0,
            };

            const reviews = await this.reviewService.getReviews(filters);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: reviews,
                }),
            };
        } catch (error) {
            console.error("Error getting reviews:", error);
            
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: "Failed to get reviews" 
                }),
            };
        }
    }

    async updateReview(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const userId = event.requestContext.authorizer?.sub;
            if (!userId) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: "Unauthorized" }),
                };
            }

            const reviewId = event.pathParameters?.reviewId;
            if (!reviewId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Review ID is required" }),
                };
            }

            const body = JSON.parse(event.body || "{}");
            const validatedData = updateReviewSchema.parse(body);

            const review = await this.reviewService.updateReview(userId, reviewId, validatedData);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: review,
                }),
            };
        } catch (error) {
            console.error("Error updating review:", error);
            
            if (error instanceof z.ZodError) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: "Validation error",
                        details: error.errors,
                    }),
                };
            }

            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: error instanceof Error ? error.message : "Failed to update review" 
                }),
            };
        }
    }

    async deleteReview(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const userId = event.requestContext.authorizer?.sub;
            if (!userId) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: "Unauthorized" }),
                };
            }

            const reviewId = event.pathParameters?.reviewId;
            if (!reviewId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Review ID is required" }),
                };
            }

            await this.reviewService.deleteReview(userId, reviewId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: "Review deleted successfully",
                }),
            };
        } catch (error) {
            console.error("Error deleting review:", error);
            
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: error instanceof Error ? error.message : "Failed to delete review" 
                }),
            };
        }
    }

    async addHostResponse(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const hostId = event.requestContext.authorizer?.sub;
            if (!hostId) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: "Unauthorized" }),
                };
            }

            const reviewId = event.pathParameters?.reviewId;
            if (!reviewId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Review ID is required" }),
                };
            }

            const body = JSON.parse(event.body || "{}");
            const validatedData = hostResponseSchema.parse(body);

            const review = await this.reviewService.addHostResponse(hostId, reviewId, validatedData);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: review,
                }),
            };
        } catch (error) {
            console.error("Error adding host response:", error);
            
            if (error instanceof z.ZodError) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: "Validation error",
                        details: error.errors,
                    }),
                };
            }

            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: error instanceof Error ? error.message : "Failed to add host response" 
                }),
            };
        }
    }

    async flagReview(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const userId = event.requestContext.authorizer?.sub;
            if (!userId) {
                return {
                    statusCode: 401,
                    headers: getSecurityHeaders(),
                    body: JSON.stringify({ error: "Unauthorized" }),
                };
            }

            const reviewId = event.pathParameters?.reviewId;
            if (!reviewId) {
                return {
                    statusCode: 400,
                    headers: getSecurityHeaders(),
                    body: JSON.stringify({ error: "Review ID is required" }),
                };
            }

            const body = JSON.parse(event.body || "{}");
            const validatedData = flagReviewSchema.parse(body);

            // Perform security checks for flagging
            const securityCheck = performSecurityChecks(
                event,
                userId,
                'FLAG_REVIEW'
            );

            if (!securityCheck.passed) {
                return {
                    statusCode: securityCheck.statusCode || 400,
                    headers: getSecurityHeaders(),
                    body: JSON.stringify({ error: securityCheck.error }),
                };
            }

            const review = await this.reviewService.flagReview(userId, reviewId, validatedData);

            return {
                statusCode: 200,
                headers: getSecurityHeaders(),
                body: JSON.stringify({
                    success: true,
                    data: review,
                }),
            };
        } catch (error) {
            console.error("Error flagging review:", error);
            
            if (error instanceof z.ZodError) {
                return {
                    statusCode: 400,
                    headers: getSecurityHeaders(),
                    body: JSON.stringify({
                        error: "Validation error",
                        details: error.errors,
                    }),
                };
            }

            return {
                statusCode: 400,
                headers: getSecurityHeaders(),
                body: JSON.stringify({ 
                    error: error instanceof Error ? error.message : "Failed to flag review" 
                }),
            };
        }
    }

    async recordHelpfulVote(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const userId = event.requestContext.authorizer?.sub;
            if (!userId) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: "Unauthorized" }),
                };
            }

            const reviewId = event.pathParameters?.reviewId;
            if (!reviewId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Review ID is required" }),
                };
            }

            const body = JSON.parse(event.body || "{}");
            const validatedData = helpfulVoteSchema.parse(body);

            await this.reviewService.recordHelpfulVote(userId, reviewId, validatedData);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: "Vote recorded successfully",
                }),
            };
        } catch (error) {
            console.error("Error recording helpful vote:", error);
            
            if (error instanceof z.ZodError) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: "Validation error",
                        details: error.errors,
                    }),
                };
            }

            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: error instanceof Error ? error.message : "Failed to record vote" 
                }),
            };
        }
    }

    async getExperienceReviewStats(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const experienceId = event.pathParameters?.experienceId;
            if (!experienceId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Experience ID is required" }),
                };
            }

            const stats = await this.reviewService.getExperienceReviewStats(experienceId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: stats,
                }),
            };
        } catch (error) {
            console.error("Error getting experience review stats:", error);
            
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: "Failed to get review stats" 
                }),
            };
        }
    }

    async getUserEligibleReservations(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const userId = event.requestContext.authorizer?.sub;
            if (!userId) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: "Unauthorized" }),
                };
            }

            const reservations = await this.reviewService.getUserEligibleReservations(userId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: reservations,
                }),
            };
        } catch (error) {
            console.error("Error getting user eligible reservations:", error);
            
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: "Failed to get eligible reservations" 
                }),
            };
        }
    }
}