import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const TimeSlotSearchBaseSchema = z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    date: z.string().date().optional(), // For specific date query
    timezone: z.string().default("UTC"),
    partySize: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50).optional(),
    offset: z.coerce.number().int().min(0).default(0).optional(),
    summary: z.coerce.boolean().default(false).optional(),
    view: z.enum(['detailed', 'summary', 'calendar']).default('detailed').optional(),
});
export const TimeSlotSearchSchema = TimeSlotSearchBaseSchema.refine(
    (data) => {
        if (data.startDate && data.endDate) {
            return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true; // Valid when dates not provided
    },
    {
        message: ERRORS.TIME_SLOT.INVALID_DATE_RANGE.CODE,
    }
);
export const TimeSlotSearchRequestSchema = z.object({
    userId: z.string(), // Guaranteed by API Gateway authorizer
    experienceId: z
        .string({
            required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
        })
        .uuid(ERRORS.EXPERIENCE.ID.INVALID_UUID.CODE),
    ...TimeSlotSearchBaseSchema.shape,
});

// Types
export type TimeSlotSearchData = Omit<
    APIGatewayEvent,
    "queryStringParameters"
> & {
    queryStringParameters: z.infer<typeof TimeSlotSearchSchema>;
};
export type TimeSlotSearchRequest = z.infer<typeof TimeSlotSearchRequestSchema>;
