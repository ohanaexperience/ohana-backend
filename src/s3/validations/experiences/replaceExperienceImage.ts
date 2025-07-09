import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import { IMAGE_MIME_TYPES } from "@/constants/shared";

// Schemas
export const ReplaceExperienceImagePathSchema = z.object({
    experienceId: z
        .string({
            required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
        })
        .uuid({
            message: "Experience ID must be a valid UUID",
        }),
    imageId: z
        .string({
            required_error: "MISSING_IMAGE_ID",
            invalid_type_error: "INVALID_IMAGE_ID_TYPE",
        })
        .uuid({
            message: "Image ID must be a valid UUID",
        }),
});
export const ReplaceExperienceImageBodySchema = z.object({
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
export const ReplaceExperienceImageRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...ReplaceExperienceImagePathSchema.shape,
    ...ReplaceExperienceImageBodySchema.shape,
});

// Types
export type ReplaceExperienceImageData = Omit<
    APIGatewayEvent,
    "pathParameters"
> & {
    pathParameters: z.infer<typeof ReplaceExperienceImagePathSchema>;
    body: z.infer<typeof ReplaceExperienceImageBodySchema>;
};
export type ReplaceExperienceImageRequest = z.infer<
    typeof ReplaceExperienceImageRequestSchema
>;
