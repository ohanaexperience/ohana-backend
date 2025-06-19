import { Request } from "@middy/core";

import ERRORS from "@/errors";

export const requirePathParameters = () => ({
    before: (handler: Request) => {
        if (!handler.event.pathParameters) {
            handler.response = {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.PATH_PARAMETERS.MISSING.CODE,
                    message: ERRORS.PATH_PARAMETERS.MISSING.MESSAGE,
                }),
            };

            return handler.response;
        }
    },
});
