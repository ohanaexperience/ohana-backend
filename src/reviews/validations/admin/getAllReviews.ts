import { z } from "zod";

export const getAllReviewsValidation = z.object({
  queryStringParameters: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).optional(),
    isPublished: z.enum(["true", "false"]).transform(val => val === "true").optional(),
    hasHostResponse: z.enum(["true", "false"]).transform(val => val === "true").optional(),
    minRating: z.string().regex(/^[1-5]$/).transform(Number).pipe(z.number().min(1).max(5)).optional(),
    maxRating: z.string().regex(/^[1-5]$/).transform(Number).pipe(z.number().min(1).max(5)).optional()
  }).optional()
});