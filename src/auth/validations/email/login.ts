import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import { emailSchema, passwordSchema } from "@/validations";

// Schemas
export const EmailLoginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

// Types
export type EmailLoginData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailLoginSchema>;
};
export type EmailLoginRequestData = z.infer<typeof EmailLoginSchema>;
