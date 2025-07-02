import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import { emailSchema } from "@/validations";

// Schemas
export const EmailResendCodeSchema = z.object({
    email: emailSchema,
});

// Types
export type EmailResendCodeData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailResendCodeSchema>;
};
export type EmailResendCodeRequestData = z.infer<typeof EmailResendCodeSchema>;
