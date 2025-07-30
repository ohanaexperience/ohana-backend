import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Path parameters schema
export const GetHostReviewsPathSchema = z.object({
  hostId: z.string().uuid("Invalid host ID")
});

// Query parameters schema
export const GetHostReviewsQuerySchema = z.object({
  experienceId: z.string().uuid("Invalid experience ID").optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).optional(),
  orderBy: z.enum(["newest", "oldest", "highest", "lowest", "helpful"]).optional(),
  minRating: z.string().regex(/^[1-5]$/).transform(Number).pipe(z.number().min(1).max(5)).optional()
}).optional();

// Combined validation schema for backward compatibility
export const getHostReviewsValidation = z.object({
  pathParameters: GetHostReviewsPathSchema,
  queryStringParameters: GetHostReviewsQuerySchema
});

// Event type
export type GetHostReviewsEvent = Omit<
    APIGatewayEvent,
    "pathParameters" | "queryStringParameters"
> & {
    pathParameters: z.infer<typeof GetHostReviewsPathSchema>;
    queryStringParameters: z.infer<typeof GetHostReviewsQuerySchema>;
    requestContext: APIGatewayEvent["requestContext"] & {
        authorizer?: {
            claims?: {
                sub?: string;
            };
        };
    };
};