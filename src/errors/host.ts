export default {
    HOST: {
        ID: {
            MISSING: {
                CODE: "HOST_ID_MISSING",
                MESSAGE: "Host ID is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_HOST_ID_TYPE",
                MESSAGE: "Host ID must be a string.",
            },
            INVALID_UUID: {
                CODE: "INVALID_HOST_ID_UUID",
                MESSAGE: "Host ID must be a valid UUID.",
            },
        },
        MISSING: { CODE: "MISSING_HOST", MESSAGE: "Host is required." },
        NOT_FOUND: { CODE: "HOST_NOT_FOUND", MESSAGE: "Host does not exist." },
    },
    HOST_VERIFICATION: {
        MISSING: {
            CODE: "MISSING_HOST_VERIFICATION",
            MESSAGE: "Host verification is required.",
        },
        NOT_FOUND: {
            CODE: "HOST_VERIFICATION_NOT_FOUND",
            MESSAGE: "Host verification does not exist.",
        },
        NOT_VERIFIED: {
            CODE: "HOST_NOT_VERIFIED",
            MESSAGE: "Host is not verified.",
        },
    },
};
