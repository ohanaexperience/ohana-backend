import { Request } from "@middy/core";

export const requireBody = () => ({
    before: (handler: Request) => {
        if (!handler.event.body) {
            handler.response = {
                statusCode: 400,
                body: JSON.stringify({
                    error: "MISSING_REQUEST_BODY",
                    message: "A request body is required.",
                }),
            };

            return handler.response;
        }
    },
});
