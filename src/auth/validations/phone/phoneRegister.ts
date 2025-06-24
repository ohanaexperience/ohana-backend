import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import { phoneNumberSchema } from "@/validations";

// Schemas
export const PhoneRegisterSchema = z.object({
    phoneNumber: phoneNumberSchema,
});

// Types
export type PhoneRegisterData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof PhoneRegisterSchema>;
};
export type PhoneRegisterRequestData = z.infer<typeof PhoneRegisterSchema>;
