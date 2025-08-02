import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

// Schemas
export const ConfirmReservationSchema = z.object({
    reservationId: z.string().uuid(),
    paymentIntentId: z.string().min(1),
});

export const ConfirmReservationRequestSchema = z.object({
    reservationId: z.string().uuid(),
    paymentIntentId: z.string().min(1),
});

// Types
export type ConfirmReservationData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof ConfirmReservationSchema>;
};

export type ConfirmReservationRequest = z.infer<typeof ConfirmReservationRequestSchema>;