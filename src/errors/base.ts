import { USER_PROFILE_IMAGE_MIME_TYPES } from "@/constants/users";

export default {
    MISSING_REQUEST_BODY: {
        CODE: "MISSING_REQUEST_BODY",
        MESSAGE: "A request body is required.",
    },
    MISSING_QUERY_STRING_PARAMETERS: {
        CODE: "MISSING_QUERY_STRING_PARAMETERS",
        MESSAGE: "Query string parameters are required.",
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
            MESSAGE: `Invalid image type. Only ${USER_PROFILE_IMAGE_MIME_TYPES.map(
                (types) => types
            ).join(", ")} are allowed.`,
        },
    },
};
