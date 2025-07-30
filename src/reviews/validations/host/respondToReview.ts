import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Body schema
export const RespondToReviewBodySchema = z.object({
    response: z.string().min(1).max(1000)
});

// Path parameters schema
export const RespondToReviewPathSchema = z.object({
    reviewId: z.string().uuid("Invalid review ID")
});

// Combined validation schema
export const respondToReviewValidation = z.object({
  pathParameters: RespondToReviewPathSchema,
  body: RespondToReviewBodySchema
});

// Event type
export type RespondToReviewEvent = Omit<APIGatewayEvent, "pathParameters" | "body"> & {
  pathParameters: z.infer<typeof RespondToReviewPathSchema>;
  body: z.infer<typeof RespondToReviewBodySchema>;
  requestContext: APIGatewayEvent["requestContext"] & {
    authorizer?: {
      claims?: {
        sub?: string;
      };
    };
  };
};

// Request type for controller
export type RespondToReviewRequest = z.infer<typeof RespondToReviewBodySchema> & {
    userId: string;
    reviewId: string;
};