import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const UpdateCategoryImagePathSchema = z.object({
    categoryId: z.string({
        required_error: "Category ID is required",
        invalid_type_error: "Category ID must be a string",
    }),
});

export const UpdateCategoryImageBodySchema = z.object({
    imageKey: z.string({
        required_error: "Image key is required",
        invalid_type_error: "Image key must be a string",
    }).min(1, "Image key cannot be empty"),
});

export const UpdateCategoryImageRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    categoryId: z.number(),
    ...UpdateCategoryImageBodySchema.shape,
});

// Types
export type UpdateCategoryImageData = Omit<APIGatewayEvent, "pathParameters" | "body"> & {
    pathParameters: z.infer<typeof UpdateCategoryImagePathSchema>;
    body: z.infer<typeof UpdateCategoryImageBodySchema>;
};

export type UpdateCategoryImageRequest = z.infer<typeof UpdateCategoryImageRequestSchema>;