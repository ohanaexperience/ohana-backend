import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";

// Schemas
export const GetPublicHostProfilePathSchema = z.object({
    hostId: z
        .string({
            required_error: ERRORS.HOST.ID.MISSING.CODE,
            invalid_type_error: ERRORS.HOST.ID.INVALID_TYPE.CODE,
        })
        .uuid({ message: ERRORS.HOST.ID.INVALID_UUID.CODE }),
});

// Types
export type GetPublicHostProfileData = Omit<
    APIGatewayEvent,
    "pathParameters"
> & {
    pathParameters: z.infer<typeof GetPublicHostProfilePathSchema>;
};
export type GetPublicHostProfileRequest = z.infer<
    typeof GetPublicHostProfilePathSchema
>;
