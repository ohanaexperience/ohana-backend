import { Request } from "@middy/core";

import ERRORS from "@/errors";

export const requireQueryStringParameters = () => ({
    before: (handler: Request) => {
        if (!handler.event.queryStringParameters) {
            handler.response = {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.QUERY_STRING_PARAMETERS.MISSING.CODE,
                    message: ERRORS.QUERY_STRING_PARAMETERS.MISSING.MESSAGE,
                }),
            };

            return handler.response;
        }
    },
});
