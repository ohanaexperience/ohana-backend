import { z } from "zod";

export const convertHoldSchema = z.object({
    headers: z.object({
        authorization: z.string(),
    }).passthrough(),
    body: z.object({
        holdId: z.string().uuid(),
        paymentIntentId: z.string().optional(),
        paymentMethodId: z.string().optional(),
        savePaymentMethod: z.boolean().optional(),
    }),
});

export type ConvertHoldData = z.infer<typeof convertHoldSchema>;

export type ConvertHoldRequest = {
    authorization: string;
    holdId: string;
    paymentIntentId?: string;
    paymentMethodId?: string;
    savePaymentMethod?: boolean;
};