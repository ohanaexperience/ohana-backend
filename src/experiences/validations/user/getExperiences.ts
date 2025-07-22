import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import {
    EXPERIENCE_TYPE,
    EXPERIENCE_CANCELLATION_POLICY,
    EXPERIENCE_AGE_RECOMMENDATIONS,
    EXPERIENCE_STATUS,
} from "@/constants/experiences";

// Schemas
export const UserExperienceSearchBaseSchema = z.object({
    // Text searches
    title: z.string().optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    startingLocationAddress: z.string().optional(),
    endingLocationAddress: z.string().optional(),
    whatToBring: z.string().optional(),

    // Exact matches
    hostId: z.string().uuid().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    subCategoryId: z.coerce.number().int().positive().optional(),
    type: z.enum(EXPERIENCE_TYPE as [string, ...string[]]).optional(),
    cancellationPolicy: z
        .enum(EXPERIENCE_CANCELLATION_POLICY as [string, ...string[]])
        .optional(),
    physicalRequirements: z.string().optional(),
    ageRecommendation: z
        .enum(EXPERIENCE_AGE_RECOMMENDATIONS as [string, ...string[]])
        .optional(),
    status: z.enum(EXPERIENCE_STATUS as [string, ...string[]]).optional(),
    isPublic: z.coerce.boolean().optional(),

    // Range queries
    minPrice: z.coerce.number().int().positive().optional(),
    maxPrice: z.coerce.number().int().positive().optional(),
    minGuests: z.coerce.number().int().positive().optional(),
    maxGuests: z.coerce.number().int().positive().optional(),
    minDurationHours: z.coerce.number().int().positive().optional(),
    maxDurationHours: z.coerce.number().int().positive().optional(),

    // Location queries
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    radiusKm: z.coerce.number().int().positive().optional(),
});
export const UserExperienceSearchSchema = UserExperienceSearchBaseSchema.refine(
    (data) => {
        if (data.minPrice && data.maxPrice && data.minPrice > data.maxPrice) {
            return false;
        }

        if (
            data.minGuests &&
            data.maxGuests &&
            data.minGuests > data.maxGuests
        ) {
            return false;
        }

        if (
            data.minDurationHours &&
            data.maxDurationHours &&
            data.minDurationHours > data.maxDurationHours
        ) {
            return false;
        }

        return true;
    },
    {
        message:
            "Invalid range: minimum value cannot be greater than maximum value",
    }
);
export const UserExperienceSearchRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...UserExperienceSearchBaseSchema.shape,
});

// Types
export type UserExperienceSearchData = Omit<
    APIGatewayEvent,
    "queryStringParameters"
> & {
    queryStringParameters: z.infer<typeof UserExperienceSearchSchema> | null;
};
export type UserExperienceSearchRequest = z.infer<
    typeof UserExperienceSearchRequestSchema
>;
