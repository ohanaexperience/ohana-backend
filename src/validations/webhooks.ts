import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

export const StripeWebhookSchema = z.object({
    "stripe-signature": z.string({
        required_error: ERRORS.STRIPE.SIGNATURE.MISSING.CODE,
        invalid_type_error: ERRORS.STRIPE.SIGNATURE.INVALID_TYPE.CODE,
    }),
});

export type StripeWebhookData = Omit<APIGatewayEvent, "headers"> & {
    headers: z.infer<typeof StripeWebhookSchema>;
};