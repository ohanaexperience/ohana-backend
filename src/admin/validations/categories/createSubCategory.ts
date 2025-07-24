import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import { IMAGE_MIME_TYPES } from "@/constants/shared";

// Schemas
export const CreateSubCategoryBodySchema = z.object({
    categoryId: z.string({
        required_error: "Category ID is required",
        invalid_type_error: "Category ID must be a string",
    }),
    name: z.string({
        required_error: "Subcategory name is required",
        invalid_type_error: "Subcategory name must be a string",
    }).min(1, "Subcategory name cannot be empty"),
    slug: z.string({
        required_error: "Subcategory slug is required",
        invalid_type_error: "Subcategory slug must be a string",
    }).min(1, "Subcategory slug cannot be empty"),
    imageMimeType: z.string({
        required_error: ERRORS.MIME_TYPE.MISSING.CODE,
        invalid_type_error: ERRORS.MIME_TYPE.INVALID_TYPE.CODE,
    }).refine(
        (mimeType) => IMAGE_MIME_TYPES.includes(mimeType),
        {
            message: ERRORS.MIME_TYPE.INVALID_IMAGE_TYPE.CODE,
        }
    ).optional(),
});

export const CreateSubCategoryRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    categoryId: z.number(),
    name: z.string(),
    slug: z.string(),
    imageMimeType: z.string().optional(),
});

// Types
export type CreateSubCategoryData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof CreateSubCategoryBodySchema>;
};

export type CreateSubCategoryRequest = z.infer<typeof CreateSubCategoryRequestSchema>;