import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const RefreshTokensSchema = z.object({
    refreshToken: z.string({
        required_error: ERRORS.REFRESH_TOKEN.MISSING.CODE,
        invalid_type_error: ERRORS.REFRESH_TOKEN.INVALID_TYPE.CODE,
    }),
});

// Types
export type RefreshTokensData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof RefreshTokensSchema>;
};
export type RefreshTokensRequestData = z.infer<typeof RefreshTokensSchema>;
