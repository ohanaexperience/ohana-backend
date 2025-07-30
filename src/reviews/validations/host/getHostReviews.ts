import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Query parameters schema
export const GetHostReviewsQuerySchema = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).optional(),
    hasHostResponse: z.enum(["true", "false"]).transform(val => val === "true").optional()
}).optional();

// Combined validation schema
export const getHostReviewsValidation = z.object({
  queryStringParameters: GetHostReviewsQuerySchema
});

// Event type
export type GetHostReviewsEvent = Omit<APIGatewayEvent, "queryStringParameters"> & {
  queryStringParameters: z.infer<typeof GetHostReviewsQuerySchema>;
  requestContext: APIGatewayEvent["requestContext"] & {
    authorizer?: {
      claims?: {
        sub?: string;
      };
    };
  };
};

// Request type for controller
export type GetHostReviewsRequest = {
    userId: string;
    limit?: number;
    offset?: number;
    hasHostResponse?: boolean;
};