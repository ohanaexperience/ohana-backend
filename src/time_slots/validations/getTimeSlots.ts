import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const TimeSlotSearchBaseSchema = z.object({
    experienceId: z
        .string({
            required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
        })
        .uuid(ERRORS.EXPERIENCE.ID.INVALID_UUID.CODE),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    // startTime: z
    //     .string()
    //     .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    //     .optional(),
    // endTime: z
    //     .string()
    //     .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    //     .optional(),
});
export const TimeSlotSearchSchema = TimeSlotSearchBaseSchema.refine(
    (data) => {
        if (data.startDate && data.endDate) {
            return new Date(data.startDate) <= new Date(data.endDate);
        }
    },
    {
        message: ERRORS.TIME_SLOT.INVALID_DATE_RANGE.CODE,
    }
);
export const TimeSlotSearchRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
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
