import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const UnfeatureExperiencePathSchema = z.object({
    experienceId: z.string({
        required_error: "Experience ID is required",
        invalid_type_error: "Experience ID must be a string",
    }),
});

export const UnfeatureExperienceRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    experienceId: z.number(),
});

// Types
export type UnfeatureExperienceData = Omit<APIGatewayEvent, "pathParameters"> & {
    pathParameters: z.infer<typeof UnfeatureExperiencePathSchema>;
};

export type UnfeatureExperienceRequest = z.infer<typeof UnfeatureExperienceRequestSchema>;