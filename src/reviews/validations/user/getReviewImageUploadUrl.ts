import { z } from "zod";

export const GetReviewImageUploadUrlSchema = z.object({
    mimeType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
    sortOrder: z.number().int().min(0).max(4).optional()
});

export const getReviewImageUploadUrlValidation = z.object({
  pathParameters: z.object({
    reviewId: z.string().uuid("Invalid review ID")
  }),
  body: GetReviewImageUploadUrlSchema
});

export type GetReviewImageUploadUrlRequest = z.infer<typeof GetReviewImageUploadUrlSchema> & {
    userId: string;
    reviewId: string;
};