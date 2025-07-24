import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const UpdateSubCategoryImagePathSchema = z.object({
    categoryId: z.string({
        required_error: "Category ID is required",
        invalid_type_error: "Category ID must be a string",
    }),
    subCategoryId: z.string({
        required_error: "SubCategory ID is required",
        invalid_type_error: "SubCategory ID must be a string",
    }),
});

export const UpdateSubCategoryImageBodySchema = z.object({
    imageKey: z.string({
        required_error: "Image key is required",
        invalid_type_error: "Image key must be a string",
    }).min(1, "Image key cannot be empty"),
});

export const UpdateSubCategoryImageRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    categoryId: z.number(),
    subCategoryId: z.number(),
    ...UpdateSubCategoryImageBodySchema.shape,
});

// Types
export type UpdateSubCategoryImageData = Omit<APIGatewayEvent, "pathParameters" | "body"> & {
    pathParameters: z.infer<typeof UpdateSubCategoryImagePathSchema>;
    body: z.infer<typeof UpdateSubCategoryImageBodySchema>;
};

export type UpdateSubCategoryImageRequest = z.infer<typeof UpdateSubCategoryImageRequestSchema>;