import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const StripeWebhookSchema = z.object({
    "stripe-signature": z.string({
        required_error: ERRORS.STRIPE.SIGNATURE.MISSING.CODE,
        invalid_type_error: ERRORS.STRIPE.SIGNATURE.INVALID_TYPE.CODE,
    }),
});

// Types
export type StripeWebhookData = Omit<APIGatewayEvent, "headers" | "body"> & {
    headers: z.infer<typeof StripeWebhookSchema>;
    body: string;
};
