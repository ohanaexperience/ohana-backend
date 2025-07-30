import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Schemas
export const GetExperienceReviewsPathSchema = z.object({
    experienceId: z.string().uuid("Invalid experience ID"),
});

export const GetExperienceReviewsQuerySchema = z
    .object({
        limit: z
            .string()
            .regex(/^\d+$/)
            .transform(Number)
            .pipe(z.number().min(1).max(100))
            .optional(),
        offset: z
            .string()
            .regex(/^\d+$/)
            .transform(Number)
            .pipe(z.number().min(0))
            .optional(),
        orderBy: z
            .enum(["newest", "oldest", "highest", "lowest", "helpful"])
            .optional(),
        minRating: z
            .string()
            .regex(/^[1-5]$/)
            .transform(Number)
            .pipe(z.number().min(1).max(5))
            .optional(),
    })
    .optional();

export const getExperienceReviewsValidation = z.object({
    pathParameters: GetExperienceReviewsPathSchema,
    queryStringParameters: GetExperienceReviewsQuerySchema,
});

// Types
export type GetExperienceReviewsEvent = Omit<
    APIGatewayEvent,
    "pathParameters" | "queryStringParameters"
> & {
    pathParameters: z.infer<typeof GetExperienceReviewsPathSchema>;
    queryStringParameters: z.infer<typeof GetExperienceReviewsQuerySchema>;
    requestContext: APIGatewayEvent["requestContext"] & {
        authorizer?: {
            claims?: {
                sub?: string;
            };
        };
    };
};
