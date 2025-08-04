import { z } from "zod";

export const completeReservationSchema = z.object({
    reservationId: z.string().uuid("Invalid reservation ID"),
    actualAttendance: z.number().int().min(0).optional(),
    hostNotes: z.string().max(1000).optional(),
    incidentReport: z.string().max(2000).optional(),
    noShow: z.boolean().optional(),
});

export const completeReservationBodySchema = z.object({
    actualAttendance: z.number().int().min(0).optional(),
    hostNotes: z.string().max(1000).optional(),
    incidentReport: z.string().max(2000).optional(),
    noShow: z.boolean().optional(),
});

export type CompleteReservationInput = z.infer<typeof completeReservationSchema>;
export type CompleteReservationBody = z.infer<typeof completeReservationBodySchema>;