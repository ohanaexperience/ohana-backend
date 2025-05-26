import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "../errors";

export const CreateVerificationSessionSchema = z.object({
    userId: z
        .string({
            required_error: ERRORS.VERIFICATION.MISSING.CODE,
            invalid_type_error: ERRORS.VERIFICATION.INVALID_TYPE.CODE,
        })
        .uuid(ERRORS.USER_ID.INVALID.CODE),
});

export type CreateVerificationSessionData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof CreateVerificationSessionSchema>;
};
