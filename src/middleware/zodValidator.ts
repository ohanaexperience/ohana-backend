import { Request } from "@middy/core";
import { ZodSchema, ZodError } from "zod";

import ERRORS from "@/errors";

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

interface ZodValidatorOptions {
    headers?: ZodSchema;
    body?: ZodSchema;
    queryStringParameters?: ZodSchema;
    pathParameters?: ZodSchema;
}

export const zodValidator = (options: ZodValidatorOptions) => {
    const before = async (request: Request) => {
        try {
            const { headers, body, queryStringParameters, pathParameters } = options;

            if (!headers && !body && !queryStringParameters && !pathParameters) {
                throw new Error("No schema provided");
            }

            if (headers) {
                const validatedHeaders = headers.parse(request.event.headers || {});

                request.event = {
                    ...request.event,
                    headers: validatedHeaders,
                };
            }

            if (body) {
                const validatedBody = body.parse(request.event.body);

                request.event = {
                    ...request.event,
                    body: validatedBody,
                };
            }

            if (queryStringParameters) {
                const validatedQueryStringParameters =
                    queryStringParameters.parse(
                        request.event.queryStringParameters || {}
                    );

                request.event = {
                    ...request.event,
                    queryStringParameters: validatedQueryStringParameters,
                };
            }

            if (pathParameters) {
                const validatedPathParameters = pathParameters.parse(
                    request.event.pathParameters || {}
                );

                request.event = {
                    ...request.event,
                    pathParameters: validatedPathParameters,
                }
            }
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
