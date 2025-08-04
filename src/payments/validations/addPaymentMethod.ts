import { z } from "zod";

export const AddPaymentMethodSchema = z.object({
    paymentMethodId: z.string().min(1, "Payment method ID is required"),
    nickname: z.string().optional(),
});

export type AddPaymentMethodRequest = z.infer<typeof AddPaymentMethodSchema>;