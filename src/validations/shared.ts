import { z } from "zod";

import ERRORS from "@/errors";

export const emailSchema = z
    .string({
        required_error: ERRORS.EMAIL.MISSING.CODE,
        invalid_type_error: ERRORS.EMAIL.INVALID_TYPE.CODE,
    })
    .email(ERRORS.EMAIL.INVALID.CODE);

export const passwordSchema = z
    .string({
        required_error: ERRORS.PASSWORD.MISSING.CODE,
        invalid_type_error: ERRORS.PASSWORD.INVALID_TYPE.CODE,
    })
    .min(8, ERRORS.PASSWORD.MIN_LENGTH.CODE)
    .regex(/[A-Z]/, ERRORS.PASSWORD.UPPERCASE.CODE)
    .regex(/[a-z]/, ERRORS.PASSWORD.LOWERCASE.CODE)
    .regex(/[0-9]/, ERRORS.PASSWORD.NUMBER.CODE)
    .regex(/[^A-Za-z0-9]/, ERRORS.PASSWORD.SYMBOL.CODE);

export const firstNameSchema = z.string({
    required_error: ERRORS.FIRST_NAME.MISSING.CODE,
    invalid_type_error: ERRORS.FIRST_NAME.INVALID_TYPE.CODE,
});

export const lastNameSchema = z.string({
    required_error: ERRORS.LAST_NAME.MISSING.CODE,
    invalid_type_error: ERRORS.LAST_NAME.INVALID_TYPE.CODE,
});

export const imageUrlSchema = z
    .string({
        required_error: ERRORS.IMAGE_URL.MISSING.CODE,
        invalid_type_error: ERRORS.IMAGE_URL.INVALID_TYPE.CODE,
    })
    .url(ERRORS.IMAGE_URL.INVALID.CODE);

export const imageObjectSchema = z.object({
    id: z.string({
        required_error: "Image ID is required",
        invalid_type_error: "Image ID must be a string",
    }),
    mimeType: z.string({
        required_error: "MIME type is required", 
        invalid_type_error: "MIME type must be a string",
    }),
    url: z.string({
        required_error: "Image URL is required",
        invalid_type_error: "Image URL must be a string", 
    }).url("Invalid image URL format"),
});

export const confirmationCodeSchema = z
    .string({
        required_error: ERRORS.CONFIRMATION_CODE.MISSING.CODE,
        invalid_type_error: ERRORS.CONFIRMATION_CODE.INVALID_TYPE.CODE,
    })
    .min(6, ERRORS.CONFIRMATION_CODE.MIN_LENGTH.CODE);

export const phoneNumberSchema = z.string({
    required_error: ERRORS.PHONE_NUMBER.MISSING.CODE,
    invalid_type_error: ERRORS.PHONE_NUMBER.INVALID_TYPE.CODE,
});
