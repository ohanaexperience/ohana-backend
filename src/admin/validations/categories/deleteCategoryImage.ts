import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const DeleteCategoryImagePathSchema = z.object({
    categoryId: z.string({
        required_error: "Category ID is required",
        invalid_type_error: "Category ID must be a string",
    }),
});

export const DeleteCategoryImageRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    categoryId: z.number(),
});

// Types
export type DeleteCategoryImageData = Omit<APIGatewayEvent, "pathParameters"> & {
    pathParameters: z.infer<typeof DeleteCategoryImagePathSchema>;
};

export type DeleteCategoryImageRequest = z.infer<typeof DeleteCategoryImageRequestSchema>;