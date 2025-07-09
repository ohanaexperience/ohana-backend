import baseErrors from "./base";
import experienceErrors from "./experiences";
import stripeErrors from "./stripe";
import hostErrors from "./host";
import timeSlotsErrors from "./timeSlots";
import reservationsErrors from "./reservations";

import { LANGUAGES } from "@/constants/shared";

export default {
    ...baseErrors,
    EMAIL: {
        MISSING: {
            CODE: "MISSING_EMAIL",
            MESSAGE: "Email is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_EMAIL_TYPE",
            MESSAGE: "Email must be a string.",
        },
        INVALID: {
            CODE: "INVALID_EMAIL",
            MESSAGE: "Invalid email address.",
        },
    },
    FIRST_NAME: {
        MISSING: {
            CODE: "MISSING_FIRST_NAME",
            MESSAGE: "First name is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_FIRST_NAME_TYPE",
            MESSAGE: "First name must be a string.",
        },
    },
    LAST_NAME: {
        MISSING: {
            CODE: "MISSING_LAST_NAME",
            MESSAGE: "Last name is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_LAST_NAME_TYPE",
            MESSAGE: "Last name must be a string.",
        },
    },
    PASSWORD: {
        MISSING: {
            CODE: "MISSING_PASSWORD",
            MESSAGE: "Password is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_PASSWORD_TYPE",
            MESSAGE: "Password must be a string.",
        },
        MIN_LENGTH: {
            CODE: "INVALID_PASSWORD_MIN_LENGTH",
            MESSAGE: "Password must be at least 8 characters.",
        },
        MAX_LENGTH: {
            CODE: "INVALID_PASSWORD_MAX_LENGTH",
            MESSAGE: "Password must be less than 32 characters.",
        },
        UPPERCASE: {
            CODE: "INVALID_PASSWORD_UPPERCASE",
            MESSAGE: "Password must contain at least one uppercase letter.",
        },
        LOWERCASE: {
            CODE: "INVALID_PASSWORD_LOWERCASE",
            MESSAGE: "Password must contain at least one lowercase letter.",
        },
        NUMBER: {
            CODE: "INVALID_PASSWORD_NUMBER",
            MESSAGE: "Password must contain at least one number.",
        },
        SYMBOL: {
            CODE: "INVALID_PASSWORD_SYMBOL",
            MESSAGE: "Password must contain at least one symbol.",
        },
    },
    PHONE_NUMBER: {
        MISSING: {
            CODE: "MISSING_PHONE_NUMBER",
            MESSAGE: "Phone number is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_PHONE_NUMBER_TYPE",
            MESSAGE: "Phone number must be a string.",
        },
    },
    LANGUAGES: {
        MISSING: {
            CODE: "MISSING_LANGUAGES",
            MESSAGE: "Languages are required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_LANGUAGES_TYPE",
            MESSAGE: "Languages must be an array.",
        },
        INVALID_VALUE: {
            CODE: "INVALID_LANGUAGE_VALUE",
            MESSAGE: `Invalid language. Must be one of the following: ${LANGUAGES.map(
                (lang) => lang
            ).join(", ")}`,
        },
    },
    BIO: {
        MISSING: {
            CODE: "MISSING_BIO",
            MESSAGE: "Bio is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_BIO_TYPE",
            MESSAGE: "Bio must be a string.",
        },
    },
    ID_VERIFIED: {
        MISSING: {
            CODE: "MISSING_ID_VERIFIED",
            MESSAGE: "ID verification is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_ID_VERIFIED_TYPE",
            MESSAGE: "ID verification must be a boolean.",
        },
    },
    TERMS_ACCEPTED: {
        MISSING: {
            CODE: "MISSING_TERMS_ACCEPTED",
            MESSAGE: "Terms and conditions are required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_TERMS_ACCEPTED_TYPE",
            MESSAGE: "Terms and conditions must be a boolean.",
        },
    },
    USER_ID: {
        MISSING: {
            CODE: "MISSING_USER_ID",
            MESSAGE: "User ID is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_USER_ID_TYPE",
            MESSAGE: "User ID must be a string.",
        },
        INVALID: {
            CODE: "INVALID_USER_ID",
            MESSAGE: "Invalid user ID, must be a valid UUID.",
        },
    },
    CONFIRMATION_CODE: {
        MISSING: {
            CODE: "MISSING_CONFIRMATION_CODE",
            MESSAGE: "Confirmation code is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_CONFIRMATION_CODE_TYPE",
            MESSAGE: "Confirmation code must be a string.",
        },
        MIN_LENGTH: {
            CODE: "INVALID_CONFIRMATION_CODE_MIN_LENGTH",
            MESSAGE: "Confirmation code must be at least 6 characters.",
        },
        EXPIRED: {
            CODE: "EXPIRED_CONFIRMATION_CODE",
            MESSAGE: "Confirmation code has expired. Please request a new code.",
        },
        INVALID: {
            CODE: "INVALID_CONFIRMATION_CODE",
            MESSAGE: "Invalid confirmation code. Please check the code and try again.",
        },
    },
    REFRESH_TOKEN: {
        MISSING: {
            CODE: "MISSING_REFRESH_TOKEN",
            MESSAGE: "Refresh token is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_REFRESH_TOKEN_TYPE",
            MESSAGE: "Refresh token must be a string.",
        },
        INVALID: {
            CODE: "INVALID_REFRESH_TOKEN",
            MESSAGE: "Invalid refresh token.",
        },
    },
    GOOGLE_ID_TOKEN: {
        MISSING: {
            CODE: "MISSING_GOOGLE_ID_TOKEN",
            MESSAGE: "Google ID token is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_GOOGLE_ID_TOKEN_TYPE",
            MESSAGE: "Google ID token must be a string.",
        },
        INVALID: {
            CODE: "INVALID_GOOGLE_ID_TOKEN",
            MESSAGE: "Invalid Google ID token.",
        },
        EXPIRED: {
            CODE: "EXPIRED_GOOGLE_ID_TOKEN",
            MESSAGE: "Google ID token has expired. Please sign in again.",
        },
    },
    USER: {
        MISSING: { CODE: "MISSING_USER", MESSAGE: "User is required." },
        NOT_FOUND: { CODE: "USER_NOT_FOUND", MESSAGE: "User does not exist." },
        ALREADY_EXISTS: {
            CODE: "USER_ALREADY_EXISTS",
            MESSAGE: "User already exists.",
        },
    },
    IMAGE_URL: {
        MISSING: {
            CODE: "MISSING_IMAGE_URL",
            MESSAGE: "Image URL is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_IMAGE_URL_TYPE",
            MESSAGE: "Image URL must be a string.",
        },
        INVALID: { CODE: "INVALID_IMAGE_URL", MESSAGE: "Invalid image URL." },
    },
    VERIFICATION: {
        MISSING: {
            CODE: "MISSING_VERIFICATION",
            MESSAGE: "Verification is required.",
        },
        INVALID_TYPE: {
            CODE: "INVALID_VERIFICATION_TYPE",
            MESSAGE: "Verification must be a string.",
        },
    },
    ...stripeErrors,
    ...hostErrors,
    ...experienceErrors,
    ...timeSlotsErrors,
    ...reservationsErrors,
};
