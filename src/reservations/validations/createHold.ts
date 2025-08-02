import { z } from "zod";

export const createHoldSchema = z.object({
    headers: z.object({
        authorization: z.string(),
        "x-idempotency-key": z.string(),
    }).passthrough(),
    body: z.object({
        experienceId: z.string().uuid(),
        timeSlotId: z.string().uuid(),
        numberOfGuests: z.number().int().positive(),
        guestName: z.string().min(1),
        guestEmail: z.string().email(),
        guestPhone: z.string().optional(),
        specialRequests: z.string().optional(),
    }),
});

export type CreateHoldData = z.infer<typeof createHoldSchema>;

export type CreateHoldRequest = {
    authorization: string;
    experienceId: string;
    timeSlotId: string;
    numberOfGuests: number;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    specialRequests?: string;
    idempotencyKey: string;
};