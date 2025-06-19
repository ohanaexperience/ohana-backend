import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

export const TimeSlotsSearchSchema = z
    .object({
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
    })
    .refine(
        (data) => {
            // Validate that startDate is not after endDate
            if (data.startDate && data.endDate) {
                return new Date(data.startDate) <= new Date(data.endDate);
            }
        },
        {
            message:
                "Invalid time range: start time/date cannot be after end time/date",
        }
    );

export type TimeSlotsSearchData = Omit<
    APIGatewayEvent,
    "queryStringParameters"
> & {
    queryStringParameters: z.infer<typeof TimeSlotsSearchSchema> | null;
};
