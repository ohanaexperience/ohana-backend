import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import { IMAGE_MIME_TYPES } from "@/constants/shared";

// Schemas
export const GetCategoryImageUploadUrlPathSchema = z.object({
    categoryId: z.string({
        required_error: "Category ID is required",
        invalid_type_error: "Category ID must be a string",
    }),
});

export const GetCategoryImageUploadUrlQuerySchema = z.object({
    mimeType: z.string({
        required_error: ERRORS.MIME_TYPE.MISSING.CODE,
        invalid_type_error: ERRORS.MIME_TYPE.INVALID_TYPE.CODE,
    }).refine(
        (mimeType) => IMAGE_MIME_TYPES.includes(mimeType),
        {
            message: ERRORS.MIME_TYPE.INVALID_IMAGE_TYPE.CODE,
        }
    ),
});

export const GetCategoryImageUploadUrlRequestSchema = z.object({
    categoryId: z.number(),
    mimeType: z.string(),
});

// Types
export type GetCategoryImageUploadUrlData = Omit<APIGatewayEvent, "pathParameters" | "queryStringParameters"> & {
    pathParameters: z.infer<typeof GetCategoryImageUploadUrlPathSchema>;
    queryStringParameters: z.infer<typeof GetCategoryImageUploadUrlQuerySchema>;
};

export type GetCategoryImageUploadUrlRequest = z.infer<typeof GetCategoryImageUploadUrlRequestSchema>;