import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import { emailSchema, passwordSchema } from "@/validations";

// Schemas
export const EmailRegisterSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

// Types
export type EmailRegisterData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailRegisterSchema>;
};
export type EmailRegisterRequestData = z.infer<typeof EmailRegisterSchema>;
