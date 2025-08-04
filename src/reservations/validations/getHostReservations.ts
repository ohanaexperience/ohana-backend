import { z } from "zod";

export const getHostReservationsQuerySchema = z.object({
    experienceId: z.string().uuid("Invalid experience ID").optional(),
    status: z.enum([
        "held",
        "pending", 
        "confirmed",
        "cancelled",
        "completed",
        "refunded"
    ]).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("20"),
    offset: z.string().transform(Number).pipe(z.number().min(0)).default("0"),
});

export type GetHostReservationsQuery = z.infer<typeof getHostReservationsQuerySchema>;