import { Request } from "@middy/core";

import ERRORS from "@/errors";

export const requireQueryStringParameters = () => ({
    before: (handler: Request) => {
        if (!handler.event.queryStringParameters) {
            handler.response = {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.MISSING_QUERY_STRING_PARAMETERS.CODE,
                    message: ERRORS.MISSING_QUERY_STRING_PARAMETERS.MESSAGE,
                }),
            };

            return handler.response;
        }
    },
});
