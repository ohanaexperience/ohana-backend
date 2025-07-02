import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import {
    RESERVATION_NUMBER_OF_GUESTS_MIN,
    RESERVATION_NUMBER_OF_GUESTS_MAX,
} from "@/constants/reservations";

// Schemas
export const CreateReservationSchema = z.object({
    experienceId: z
        .string({
            required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
        })
        .uuid(ERRORS.EXPERIENCE.ID.INVALID_UUID.CODE),
    timeSlotId: z
        .string({
            required_error: ERRORS.TIME_SLOT.ID.MISSING.CODE,
            invalid_type_error: ERRORS.TIME_SLOT.ID.INVALID_TYPE.CODE,
        })
        .uuid(ERRORS.EXPERIENCE.ID.INVALID_UUID.CODE),

    numberOfGuests: z
        .number({
            required_error: ERRORS.RESERVATIONS.NUMBER_OF_GUESTS.MISSING.CODE,
            invalid_type_error:
                ERRORS.RESERVATIONS.NUMBER_OF_GUESTS.INVALID_TYPE.CODE,
        })
        .min(
            RESERVATION_NUMBER_OF_GUESTS_MIN,
            ERRORS.RESERVATIONS.NUMBER_OF_GUESTS.MIN_VALUE.CODE
        )
        .max(
            RESERVATION_NUMBER_OF_GUESTS_MAX,
            ERRORS.RESERVATIONS.NUMBER_OF_GUESTS.MAX_VALUE.CODE
        ),
});
export const CreateReservationRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...CreateReservationSchema.shape,
});

// Types
export type CreateReservationData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof CreateReservationSchema>;
};
export type CreateReservationRequest = z.infer<
    typeof CreateReservationRequestSchema
>;
