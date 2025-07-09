import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import { IMAGE_MIME_TYPES } from "@/constants/shared";

// Schemas
export const GetProfileImageUploadUrlSchema = z.object({
    mimeType: z
        .string({
            required_error: ERRORS.MIME_TYPE.MISSING.CODE,
            invalid_type_error: ERRORS.MIME_TYPE.INVALID_TYPE.CODE,
        })
        .refine(
            (mimeType) => {
                return IMAGE_MIME_TYPES.includes(mimeType);
            },
            {
                message: ERRORS.MIME_TYPE.INVALID_IMAGE_TYPE.CODE,
            }
        ),
});
export const GetProfileImageUploadUrlRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...GetProfileImageUploadUrlSchema.shape,
});

// Types
export type GetProfileImageUploadUrlData = Omit<
    APIGatewayEvent,
    "queryStringParameters"
> & {
    queryStringParameters: z.infer<typeof GetProfileImageUploadUrlSchema>;
};
export type GetProfileImageUploadUrlRequest = z.infer<
    typeof GetProfileImageUploadUrlRequestSchema
>;
