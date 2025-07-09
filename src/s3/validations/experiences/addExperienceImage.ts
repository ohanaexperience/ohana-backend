import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import { EXPERIENCE_IMAGE_TYPES } from "@/constants/experiences";
import { IMAGE_MIME_TYPES } from "@/constants/shared";
import ERRORS from "@/errors";

// Schemas
export const AddExperienceImagePathSchema = z.object({
    experienceId: z
        .string({
            required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
        })
        .uuid({
            message: "Experience ID must be a valid UUID",
        }),
});

export const AddExperienceImageBodySchema = z.object({
    imageType: z.enum(EXPERIENCE_IMAGE_TYPES as [string, ...string[]], {
        required_error: ERRORS.EXPERIENCE.IMAGE_TYPE.MISSING.CODE,
        invalid_type_error: ERRORS.EXPERIENCE.IMAGE_TYPE.INVALID_TYPE.CODE,
    }),
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

export const AddExperienceImageRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...AddExperienceImagePathSchema.shape,
    ...AddExperienceImageBodySchema.shape,
});

// Types
export type AddExperienceImageData = Omit<
    APIGatewayEvent,
    "pathParameters"
> & {
    pathParameters: z.infer<typeof AddExperienceImagePathSchema>;
    body: z.infer<typeof AddExperienceImageBodySchema>;
};

export type AddExperienceImageRequest = z.infer<
    typeof AddExperienceImageRequestSchema
>;