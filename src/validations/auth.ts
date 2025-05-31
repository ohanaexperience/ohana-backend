import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "@/errors";
import {
    emailSchema,
    passwordSchema,
    confirmationCodeSchema,
    phoneNumberSchema,
} from "@/validations/shared";

export const PhoneRegisterSchema = phoneNumberSchema;

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

export const RefreshTokensSchema = z.object({
    refreshToken: z.string({
        required_error: ERRORS.REFRESH_TOKEN.MISSING.CODE,
        invalid_type_error: ERRORS.REFRESH_TOKEN.INVALID_TYPE.CODE,
    }),
});

export const GoogleSignInSchema = z.object({
    idToken: z
        .string({
            required_error: ERRORS.GOOGLE_ID_TOKEN.MISSING.CODE,
            invalid_type_error: ERRORS.GOOGLE_ID_TOKEN.INVALID_TYPE.CODE,
        })
        .jwt({ alg: "RS256", message: ERRORS.GOOGLE_ID_TOKEN.INVALID.CODE }),
});

export type PhoneRegisterData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof PhoneRegisterSchema>;
};
export type EmailRegisterData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailRegisterSchema>;
};
export type EmailResendCodeData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailResendCodeSchema>;
};
export type EmailConfirmCodeData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailConfirmCodeSchema>;
};
export type EmailForgotPasswordData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailForgotPasswordSchema>;
};
export type ConfirmForgotPasswordData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof ConfirmForgotPasswordSchema>;
};
export type EmailLoginData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof EmailLoginSchema>;
};
export type RefreshTokensData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof RefreshTokensSchema>;
};
export type GoogleSignInData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof GoogleSignInSchema>;
};
