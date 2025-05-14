import { Request } from "@middy/core";
import { ZodSchema, ZodError } from "zod";

import ERRORS from "../constants/validations/errors";

const parseErrorCode = (errorCode: string) => {
    for (const category of Object.values(ERRORS)) {
        for (const errorType of Object.values(category)) {
            if (errorType.CODE === errorCode) {
                return errorType.MESSAGE;
            }
        }
    }

    return "Something went wrong.";
};

export const zodValidator = (schema: ZodSchema) => {
    const before = async (request: Request) => {
        try {
            const result = schema.parse(request.event.body);

            request.event = {
                ...request.event,
                body: result,
            };
        } catch (error) {
            if (error instanceof ZodError) {
                console.log("error", error);

                const firstError = error.errors[0];
                const code = firstError.message;

                const message = parseErrorCode(code);

                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: code,
                        message: message,
                    }),
                };
            }

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "INTERNAL_SERVER_ERROR",
                    message: "An unexpected error occurred.",
                }),
            };
        }
    };

    return {
        before,
    };
};
