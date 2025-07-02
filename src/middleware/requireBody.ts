import { Request } from "@middy/core";

import ERRORS from "@/errors";

export const requireBody = () => ({
    before: (handler: Request) => {
        if (!handler.event.body) {
            handler.response = {
                statusCode: 400,
                body: JSON.stringify({
                    error: ERRORS.REQUEST_BODY.MISSING.CODE,
                    message: ERRORS.REQUEST_BODY.MISSING.MESSAGE,
                }),
            };

            return handler.response;
        }
    },
});
