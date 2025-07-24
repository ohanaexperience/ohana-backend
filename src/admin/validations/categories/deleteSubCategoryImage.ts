import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const DeleteSubCategoryImagePathSchema = z.object({
    categoryId: z.string({
        required_error: "Category ID is required",
        invalid_type_error: "Category ID must be a string",
    }),
    subCategoryId: z.string({
        required_error: "SubCategory ID is required",
        invalid_type_error: "SubCategory ID must be a string",
    }),
});

export const DeleteSubCategoryImageRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    categoryId: z.number(),
    subCategoryId: z.number(),
});

// Types
export type DeleteSubCategoryImageData = Omit<APIGatewayEvent, "pathParameters"> & {
    pathParameters: z.infer<typeof DeleteSubCategoryImagePathSchema>;
};

export type DeleteSubCategoryImageRequest = z.infer<typeof DeleteSubCategoryImageRequestSchema>;