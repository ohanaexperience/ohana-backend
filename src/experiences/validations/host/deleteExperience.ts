import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const DeleteExperiencePathSchema = z.object({
    experienceId: z
        .string({
            required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
        })
        .uuid(ERRORS.EXPERIENCE.ID.INVALID_UUID.CODE),
});
export const DeleteExperienceSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...DeleteExperiencePathSchema.shape,
});

// Types
export type DeleteExperienceData = Omit<APIGatewayEvent, "pathParameters"> & {
    pathParameters: z.infer<typeof DeleteExperiencePathSchema>;
};
export type DeleteExperienceRequest = z.infer<typeof DeleteExperienceSchema>;
