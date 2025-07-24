import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const FeatureExperiencePathSchema = z.object({
    experienceId: z.string({
        required_error: "Experience ID is required",
        invalid_type_error: "Experience ID must be a string",
    }),
});

export const FeatureExperienceRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    experienceId: z.number(),
});

// Types
export type FeatureExperienceData = Omit<APIGatewayEvent, "pathParameters"> & {
    pathParameters: z.infer<typeof FeatureExperiencePathSchema>;
};

export type FeatureExperienceRequest = z.infer<typeof FeatureExperienceRequestSchema>;