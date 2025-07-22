import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import {
    firstNameSchema,
    lastNameSchema,
    phoneNumberSchema,
    imageObjectSchema,
} from "@/validations/shared";
import ERRORS from "@/errors";

// Schemas
export const UpdateUserProfileBaseSchema = z.object({
    // User
    firstName: firstNameSchema.optional(),
    lastName: lastNameSchema.optional(),
    phoneNumber: phoneNumberSchema.optional(),
    profileImage: imageObjectSchema.optional(),

    // Host
    bio: z
        .string({
            required_error: "MISSING_BIO",
            invalid_type_error: "INVALID_BIO_TYPE",
        })
        .min(1, "Bio is required.")
        .optional(),
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
});
export const UpdateUserProfileSchema = UpdateUserProfileBaseSchema.refine(
    (data) => {
        return Object.values(data).some((value) => value !== undefined);
    },
    {
        message: "At least one field is required.",
        path: ["_errors"],
    }
);
export const UpdateUserProfileRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...UpdateUserProfileBaseSchema.shape,
});

// Types
export type UpdateUserProfileData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof UpdateUserProfileSchema>;
};
export type UpdateUserProfileRequest = z.infer<
    typeof UpdateUserProfileRequestSchema
>;
