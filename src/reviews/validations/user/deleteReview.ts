import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Path parameters schema
export const DeleteReviewPathSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID")
});

// Combined validation schema
export const deleteReviewValidation = z.object({
  pathParameters: DeleteReviewPathSchema
});

// Event type
export type DeleteReviewEvent = Omit<APIGatewayEvent, "pathParameters"> & {
  pathParameters: z.infer<typeof DeleteReviewPathSchema>;
  requestContext: APIGatewayEvent["requestContext"] & {
    authorizer?: {
      claims?: {
        sub?: string;
      };
    };
  };
};

// Request type for controller
export type DeleteReviewRequest = {
    userId: string;
    reviewId: string;
};