import { IMAGE_MIME_TYPES } from "@/constants/shared";

export default {
    AUTHORIZATION: {
        MISSING: {
            CODE: "MISSING_AUTHORIZATION",
            MESSAGE: "Authorization is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_AUTHORIZATION_TYPE",
            MESSAGE: "Invalid authorization type. Must be a string.",
        },
        UNAUTHORIZED: {
            CODE: "UNAUTHORIZED",
            MESSAGE: "Unauthorized.",
        },
    },
    REQUEST_BODY: {
        MISSING: {
            CODE: "MISSING_REQUEST_BODY",
            MESSAGE: "A request body is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_REQUEST_BODY_TYPE",
            MESSAGE: "Invalid request body type. Must be a JSON object.",
        },
    },
    QUERY_STRING_PARAMETERS: {
        MISSING: {
            CODE: "MISSING_QUERY_STRING_PARAMETERS",
            MESSAGE: "Query string parameters are required.",
        },
    },
    PATH_PARAMETERS: {
        MISSING: {
            CODE: "MISSING_PATH_PARAMETERS",
            MESSAGE: "Path parameters are required.",
        },
    },
    MIME_TYPE: {
        MISSING: {
            CODE: "MISSING_MIME_TYPE",
            MESSAGE: "MIME type is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_MIME_TYPE",
            MESSAGE: "Invalid MIME type. Must be a string.",
        },
        INVALID_IMAGE_TYPE: {
            CODE: "INVALID_IMAGE_TYPE",
            MESSAGE: `Invalid image type. Only ${IMAGE_MIME_TYPES.map(
                (types) => types
            ).join(", ")} are allowed.`,
        },
    },
    ADMIN_REQUIRED: {
        CODE: "ADMIN_REQUIRED",
        MESSAGE: "Admin access is required.",
    },
};
