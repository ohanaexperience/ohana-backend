import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ReviewController } from "@/reviews/controllers/reviewController";
import { getDatabase } from "@/utils/database";

const database = getDatabase();
const reviewController = new ReviewController({ database });

// User review endpoints
export const createReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.createReview(event);
};

export const getReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.getReview(event);
};

export const getReviews = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.getReviews(event);
};

export const updateReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.updateReview(event);
};

export const deleteReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.deleteReview(event);
};

export const flagReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.flagReview(event);
};

export const recordHelpfulVote = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.recordHelpfulVote(event);
};

export const getUserEligibleReservations = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.getUserEligibleReservations(event);
};

// Host review endpoints  
export const addHostResponse = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.addHostResponse(event);
};

// Public review endpoints
export const getExperienceReviewStats = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return reviewController.getExperienceReviewStats(event);
};