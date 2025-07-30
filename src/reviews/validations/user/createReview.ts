import { z } from "zod";
import { APIGatewayProxyEvent } from "aws-lambda";

export const CreateReviewSchema = z.object({
    reservationId: z.string().uuid("Invalid reservation ID"),
    rating: z.number().int().min(1).max(5),
    title: z.string().min(1).max(100).optional(),
    comment: z.string().min(1).max(2000).optional(),
    images: z.array(z.string().url()).max(5).optional(),
});

export const createReviewValidation = z.object({
    body: CreateReviewSchema,
});

export type CreateReviewRequest = z.infer<typeof CreateReviewSchema> & {
    userId: string;
};

export type CreateReviewEvent = Omit<APIGatewayProxyEvent, "body"> & {
    body: z.infer<typeof CreateReviewSchema>;
};
