import { z } from "zod";

export const moderateReviewValidation = z.object({
  pathParameters: z.object({
    reviewId: z.string().uuid("Invalid review ID")
  }),
  body: z.object({
    isPublished: z.boolean()
  })
});