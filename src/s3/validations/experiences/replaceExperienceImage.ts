import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import { EXPERIENCE_IMAGE_TYPES } from "@/constants/experiences";
import ERRORS from "@/errors";

export const ReplaceExperienceImageSchema = z.object({
    imageType: z.enum(EXPERIENCE_IMAGE_TYPES as [string, ...string[]], {
        errorMap: (issue, ctx) => {
            if (issue.code === z.ZodIssueCode.invalid_type) {
                if (issue.received === "undefined") {
                    return {
                        message: ERRORS.EXPERIENCE.IMAGE_TYPE.MISSING.CODE,
                    };
                }
                return {
                    message: ERRORS.EXPERIENCE.IMAGE_TYPE.INVALID_TYPE.CODE,
                };
            }
            if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                return {
                    message: ERRORS.EXPERIENCE.IMAGE_TYPE.INVALID_VALUE.CODE,
                };
            }
            return { message: ctx.defaultError };
        },
    }),
    mimeType: z
        .string({
            required_error: "MISSING_MIME_TYPE",
            invalid_type_error: "INVALID_MIME_TYPE_TYPE",
        })
        .refine(
            (mimeType) => {
                return (
                    mimeType.includes("/") &&
                    mimeType.startsWith("image/")
                );
            },
            {
                message: "INVALID_MIME_TYPE",
            }
        ),
});

export const ReplaceExperienceImageRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    experienceId: z.string({
        required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
        invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
    }),
    imageId: z.string({
        required_error: "MISSING_IMAGE_ID",
        invalid_type_error: "INVALID_IMAGE_ID_TYPE",
    }),
    ...ReplaceExperienceImageSchema.shape,
});

export type ReplaceExperienceImageData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof ReplaceExperienceImageSchema>;
};

export type ReplaceExperienceImageRequest = z.infer<
    typeof ReplaceExperienceImageRequestSchema
>;