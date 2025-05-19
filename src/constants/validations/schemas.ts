import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "./errors";

// Base Schemas
const emailSchema = z
    .string({
        required_error: ERRORS.EMAIL.MISSING.CODE,
        invalid_type_error: ERRORS.EMAIL.INVALID_TYPE.CODE,
    })
    .email(ERRORS.EMAIL.INVALID.CODE);

const passwordSchema = z
    .string({
        required_error: ERRORS.PASSWORD.MISSING.CODE,
        invalid_type_error: ERRORS.PASSWORD.INVALID_TYPE.CODE,
    })
    .min(8, ERRORS.PASSWORD.MIN_LENGTH.CODE)
    .regex(/[A-Z]/, ERRORS.PASSWORD.UPPERCASE.CODE)
    .regex(/[a-z]/, ERRORS.PASSWORD.LOWERCASE.CODE)
    .regex(/[0-9]/, ERRORS.PASSWORD.NUMBER.CODE)
    .regex(/[^A-Za-z0-9]/, ERRORS.PASSWORD.SYMBOL.CODE);

const firstNameSchema = z.string({
    required_error: ERRORS.FIRST_NAME.MISSING.CODE,
    invalid_type_error: ERRORS.FIRST_NAME.INVALID_TYPE.CODE,
});

const lastNameSchema = z.string({
    required_error: ERRORS.LAST_NAME.MISSING.CODE,
    invalid_type_error: ERRORS.LAST_NAME.INVALID_TYPE.CODE,
});

const imageUrlSchema = z
    .string({
        required_error: ERRORS.IMAGE_URL.MISSING.CODE,
        invalid_type_error: ERRORS.IMAGE_URL.INVALID_TYPE.CODE,
    })
    .url(ERRORS.IMAGE_URL.INVALID.CODE);

const confirmationCodeSchema = z
    .string({
        required_error: ERRORS.CONFIRMATION_CODE.MISSING.CODE,
        invalid_type_error: ERRORS.CONFIRMATION_CODE.INVALID_TYPE.CODE,
    })
    .min(6, ERRORS.CONFIRMATION_CODE.MIN_LENGTH.CODE);

// Phone Schema
export const PhoneRegisterSchema = z.string({
    required_error: ERRORS.PHONE_NUMBER.MISSING.CODE,
    invalid_type_error: ERRORS.PHONE_NUMBER.INVALID_TYPE.CODE,
});

// Email Schema
export const EmailRegisterSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

export const EmailResendCodeSchema = z.object({
    email: emailSchema,
});

export const EmailConfirmCodeSchema = z.object({
    email: emailSchema,
    confirmationCode: confirmationCodeSchema,
});

export const EmailForgotPasswordSchema = z.object({
    email: emailSchema,
});

export const ConfirmForgotPasswordSchema = z.object({
    email: emailSchema,
    newPassword: passwordSchema,
    confirmationCode: confirmationCodeSchema,
});

export const EmailLoginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

// Tokens
export const RefreshTokensSchema = z.object({
    refreshToken: z.string({
        required_error: ERRORS.REFRESH_TOKEN.MISSING.CODE,
        invalid_type_error: ERRORS.REFRESH_TOKEN.INVALID_TYPE.CODE,
    }),
});

// Google
export const GoogleSignInSchema = z.object({
    idToken: z
        .string({
            required_error: ERRORS.GOOGLE_ID_TOKEN.MISSING.CODE,
            invalid_type_error: ERRORS.GOOGLE_ID_TOKEN.INVALID_TYPE.CODE,
        })
        .jwt({ alg: "RS256", message: ERRORS.GOOGLE_ID_TOKEN.INVALID.CODE }),
});

// User
export const UserGetProfileSchema = z.object({});
export const UserUpdateProfileSchema = z
    .object({
        firstName: firstNameSchema.optional(),
        lastName: lastNameSchema.optional(),
        phoneNumber: PhoneRegisterSchema.optional(),
        profileImageUrl: imageUrlSchema.optional(),
    })
    .refine(
        (data) => {
            return Object.values(data).some((value) => value !== undefined);
        },
        {
            message: "At least one field is required.",
            path: ["_errors"],
        }
    );

// Verification Schema
export const CreateVerificationSessionSchema = z.object({
    userId: z
        .string({
            required_error: ERRORS.VERIFICATION.MISSING.CODE,
            invalid_type_error: ERRORS.VERIFICATION.INVALID_TYPE.CODE,
        })
        .uuid(ERRORS.USER_ID.INVALID.CODE),
});

// Host Schema
export const UpdateHostProfileSchema = z
    .object({
        languages: z
            .array(
                z.string({
                    required_error: "MISSING_LANGUAGES",
                    invalid_type_error: "INVALID_LANGUAGES_TYPE",
                }),
                {
                    required_error: "MISSING_LANGUAGES_ARRAY",
                    invalid_type_error: "INVALID_LANGUAGES_ARRAY_TYPE",
                }
            )
            .min(1, "Languages are required.")
            .optional(),
        bio: z
            .string({
                required_error: "MISSING_BIO",
                invalid_type_error: "INVALID_BIO_TYPE",
            })
            .min(1, "Bio is required.")
            .optional(),
    })
    .refine(
        (data) => {
            return Object.values(data).some((value) => value !== undefined);
        },
        {
            message: "At least one field is required.",
            path: ["_errors"],
        }
    );

// Base Input Types
interface APIGatewayEvent<T> {
    headers: {
        authorization: string;
        [key: string]: string | undefined;
    };
    body: T;
}

// Phone Schemas
export type PhoneRegisterData = { body: z.infer<typeof PhoneRegisterSchema> };

// Email Schemas
export type EmailRegisterData = { body: z.infer<typeof EmailRegisterSchema> };
export type EmailResendCodeData = {
    body: z.infer<typeof EmailResendCodeSchema>;
};
export type EmailConfirmCodeData = {
    body: z.infer<typeof EmailConfirmCodeSchema>;
};
export type EmailForgotPasswordData = {
    body: z.infer<typeof EmailForgotPasswordSchema>;
};
export type ConfirmForgotPasswordData = {
    body: z.infer<typeof ConfirmForgotPasswordSchema>;
};
export type EmailLoginData = { body: z.infer<typeof EmailLoginSchema> };

// Tokens
export type RefreshTokensData = { body: z.infer<typeof RefreshTokensSchema> };

// Google
export type GoogleSignInData = { body: z.infer<typeof GoogleSignInSchema> };

// User
export type UserGetProfileData = APIGatewayEvent<
    z.infer<typeof UserGetProfileSchema>
>;
export type UserUpdateProfileData = APIGatewayEvent<
    z.infer<typeof UserUpdateProfileSchema>
>;

// Stripe
export type CreateVerificationSessionData = APIGatewayEvent<
    z.infer<typeof CreateVerificationSessionSchema>
>;

// Host
export type UpdateHostProfileData = APIGatewayEvent<
    z.infer<typeof UpdateHostProfileSchema>
>;
