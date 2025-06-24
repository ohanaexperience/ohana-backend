import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import { emailSchema } from "@/validations";

// Schemas
export const EmailForgotPasswordSchema = z.object({
    email: emailSchema,
});

// Types
export type EmailForgotPasswordData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailForgotPasswordSchema>;
};
export type EmailForgotPasswordRequestData = z.infer<
    typeof EmailForgotPasswordSchema
>;
