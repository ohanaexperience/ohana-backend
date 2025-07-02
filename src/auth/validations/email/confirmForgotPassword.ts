import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import {
    emailSchema,
    passwordSchema,
    confirmationCodeSchema,
} from "@/validations";

// Schemas
export const EmailConfirmForgotPasswordSchema = z.object({
    email: emailSchema,
    newPassword: passwordSchema,
    confirmationCode: confirmationCodeSchema,
});

// Types
export type EmailConfirmForgotPasswordData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailConfirmForgotPasswordSchema>;
};
export type EmailConfirmForgotPasswordRequestData = z.infer<
    typeof EmailConfirmForgotPasswordSchema
>;
