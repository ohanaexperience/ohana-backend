import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Path parameters schema
export const GetReviewStatsPathSchema = z.object({
  experienceId: z.string().uuid("Invalid experience ID")
});

// Combined validation schema
export const getReviewStatsValidation = z.object({
  pathParameters: GetReviewStatsPathSchema
});

// Event type
export type GetReviewStatsEvent = Omit<APIGatewayEvent, "pathParameters"> & {
  pathParameters: z.infer<typeof GetReviewStatsPathSchema>;
};