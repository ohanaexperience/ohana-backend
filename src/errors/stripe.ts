import { createHandler } from "@/experiences";

export default {
    STRIPE: {
        SIGNATURE: {
            MISSING: {
                CODE: "MISSING_STRIPE_SIGNATURE",
                MESSAGE: "A stripe signature is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_STRIPE_SIGNATURE_TYPE",
                MESSAGE: "Stripe signature must be a string.",
            },
        },
        VERIFICATION: {
            SESSION_NOT_FOUND: {
                CODE: "VERIFICATION_SESSION_NOT_FOUND",
                MESSAGE: "No verification session found.",
            },
            FAILED_TO_CREATE: {
                CODE: "FAILED_TO_CREATE_VERIFICATION_SESSION",
                MESSAGE: "Failed to create verification session",
            },
            ALREADY_APPROVED: {
                CODE: "VERIFICATION_ALREADY_APPROVED",
                MESSAGE: "Verification already approved.",
            },
            SESSION_REDACTED: {
                CODE: "VERIFICATION_SESSION_REDACTED",
                MESSAGE: "Verification session has been redacted, please restart the verification process.",
            },
        },
    },
};
