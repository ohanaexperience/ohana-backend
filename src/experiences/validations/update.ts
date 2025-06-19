import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import { CreateExperienceSchema } from "./create";
import ERRORS from "@/errors";

// Schemas
export const UpdateExperiencePathSchema = z.object({
    experienceId: z.string({
        required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
        invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
    }),
});
export const UpdateExperienceSchema = CreateExperienceSchema.partial();
export const UpdateExperienceRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...UpdateExperiencePathSchema.shape,
    ...UpdateExperienceSchema.shape,
});

// Types
export type UpdateExperienceData = Omit<
    APIGatewayEvent,
    "body" | "pathParameters"
> & {
    pathParameters: z.infer<typeof UpdateExperiencePathSchema>;
    body: z.infer<typeof UpdateExperienceSchema>;
};
export type UpdateExperienceRequest = z.infer<
    typeof UpdateExperienceRequestSchema
>;
