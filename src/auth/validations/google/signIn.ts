import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const GoogleSignInSchema = z.object({
    idToken: z
        .string({
            required_error: ERRORS.GOOGLE_ID_TOKEN.MISSING.CODE,
            invalid_type_error: ERRORS.GOOGLE_ID_TOKEN.INVALID_TYPE.CODE,
        })
        .jwt({ alg: "RS256", message: ERRORS.GOOGLE_ID_TOKEN.INVALID.CODE }),
});

// Types
export type GoogleSignInData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof GoogleSignInSchema>;
};
export type GoogleSignInRequestData = z.infer<typeof GoogleSignInSchema>;
