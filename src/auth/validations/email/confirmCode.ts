import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import { emailSchema, confirmationCodeSchema } from "@/validations";

// Schemas
export const EmailConfirmCodeSchema = z.object({
    email: emailSchema,
    confirmationCode: confirmationCodeSchema,
});

// Types
export type EmailConfirmCodeData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailConfirmCodeSchema>;
};
export type EmailConfirmCodeRequestData = z.infer<
    typeof EmailConfirmCodeSchema
>;
