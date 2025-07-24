import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import { IMAGE_MIME_TYPES } from "@/constants/shared";

// Schemas
export const GetSubCategoryImageUploadUrlPathSchema = z.object({
    subCategoryId: z.string({
        required_error: "SubCategory ID is required",
        invalid_type_error: "SubCategory ID must be a string",
    }),
});

export const GetSubCategoryImageUploadUrlQuerySchema = z.object({
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

export const GetSubCategoryImageUploadUrlRequestSchema = z.object({
    subCategoryId: z.number(),
    mimeType: z.string(),
});

// Types
export type GetSubCategoryImageUploadUrlData = Omit<APIGatewayEvent, "pathParameters" | "queryStringParameters"> & {
    pathParameters: z.infer<typeof GetSubCategoryImageUploadUrlPathSchema>;
    queryStringParameters: z.infer<typeof GetSubCategoryImageUploadUrlQuerySchema>;
};

export type GetSubCategoryImageUploadUrlRequest = z.infer<typeof GetSubCategoryImageUploadUrlRequestSchema>;