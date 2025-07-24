import { Request } from "@middy/core";

import ERRORS from "@/errors";

export const requireAdmin = () => ({
    before: (handler: Request) => {
        const groups =
            handler.event.requestContext?.authorizer?.claims["cognito:groups"];

        if (!groups?.split(",").includes("admin")) {
            handler.response = {
                statusCode: 403,
                body: JSON.stringify({
                    error: ERRORS.ADMIN_REQUIRED.CODE,
                    message: ERRORS.ADMIN_REQUIRED.MESSAGE,
                }),
            };

            return handler.response;
        }
    },
});
