import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

export const DeleteExperienceImageByIdRequestSchema = z.object({
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
});

export type DeleteExperienceImageByIdRequest = z.infer<
    typeof DeleteExperienceImageByIdRequestSchema
>;