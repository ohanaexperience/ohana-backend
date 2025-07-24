import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import { IMAGE_MIME_TYPES } from "@/constants/shared";

// Schemas
export const CreateCategoryBodySchema = z.object({
    name: z.string({
        required_error: "Category name is required",
        invalid_type_error: "Category name must be a string",
    }).min(1, "Category name cannot be empty"),
    slug: z.string({
        required_error: "Category slug is required",
        invalid_type_error: "Category slug must be a string",
    }).min(1, "Category slug cannot be empty"),
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

export const CreateCategoryRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...CreateCategoryBodySchema.shape,
});

// Types
export type CreateCategoryData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof CreateCategoryBodySchema>;
};

export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;