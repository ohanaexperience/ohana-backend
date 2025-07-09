import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const DeleteExperienceImageByIdPathSchema = z.object({
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
export const DeleteExperienceImageByIdRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...DeleteExperienceImageByIdPathSchema.shape,
});

// Types
export type DeleteExperienceImageByIdData = Omit<
    APIGatewayEvent,
    "pathParameters"
> & {
    pathParameters: z.infer<typeof DeleteExperienceImageByIdPathSchema>;
};
export type DeleteExperienceImageByIdRequest = z.infer<
    typeof DeleteExperienceImageByIdRequestSchema
>;
