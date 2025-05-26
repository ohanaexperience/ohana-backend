import { Request } from "@middy/core";
import { ZodSchema, ZodError } from "zod";

import ERRORS from "../constants/errors";

const createErrorLookup = (errors: any): Record<string, string> => {
    const lookup: Record<string, string> = {};

    const traverse = (obj: any) => {
        for (const value of Object.values(obj)) {
            if (value && typeof value === "object") {
                if ("CODE" in value && "MESSAGE" in value) {
                    lookup[value.CODE as string] = value.MESSAGE as string;
                } else {
                    traverse(value);
                }
            }
        }
    };

    traverse(errors);
    return lookup;
};

const ERROR_LOOKUP = createErrorLookup(ERRORS);

const parseErrorCode = (errorCode: string) => {
    return ERROR_LOOKUP[errorCode] || "Something went wrong.";
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
