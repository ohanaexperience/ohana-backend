import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Body schema
export const UpdateReviewBodySchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().min(1).max(100).optional(),
    comment: z.string().min(1).max(2000).optional()
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update"
});

// Path parameters schema
export const UpdateReviewPathSchema = z.object({
    reviewId: z.string().uuid("Invalid review ID")
});

// Combined validation schema
export const updateReviewValidation = z.object({
  pathParameters: UpdateReviewPathSchema,
  body: UpdateReviewBodySchema
});

// Event type
export type UpdateReviewEvent = Omit<APIGatewayEvent, "pathParameters" | "body"> & {
  pathParameters: z.infer<typeof UpdateReviewPathSchema>;
  body: z.infer<typeof UpdateReviewBodySchema>;
  requestContext: APIGatewayEvent["requestContext"] & {
    authorizer?: {
      claims?: {
        sub?: string;
      };
    };
  };
};

// Request type for controller
export type UpdateReviewRequest = z.infer<typeof UpdateReviewBodySchema> & {
    userId: string;
    reviewId: string;
};