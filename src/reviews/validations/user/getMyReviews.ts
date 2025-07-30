import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Query parameters schema
export const GetMyReviewsQuerySchema = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).optional()
}).optional();

// Combined validation schema
export const getMyReviewsValidation = z.object({
  queryStringParameters: GetMyReviewsQuerySchema
});

// Event type
export type GetMyReviewsEvent = Omit<APIGatewayEvent, "queryStringParameters"> & {
  queryStringParameters: z.infer<typeof GetMyReviewsQuerySchema>;
  requestContext: APIGatewayEvent["requestContext"] & {
    authorizer?: {
      claims?: {
        sub?: string;
      };
    };
  };
};

// Request type for controller
export type GetMyReviewsRequest = {
    userId: string;
    limit?: number;
    offset?: number;
};