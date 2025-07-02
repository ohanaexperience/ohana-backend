import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import {
    firstNameSchema,
    lastNameSchema,
    phoneNumberSchema,
    imageUrlSchema,
} from "@/validations/shared";
import ERRORS from "@/errors";

// Schemas
export const UpdateUserProfileBaseSchema = z.object({
    firstName: firstNameSchema.optional(),
    lastName: lastNameSchema.optional(),
    phoneNumber: phoneNumberSchema.optional(),
    profileImageUrl: imageUrlSchema.optional(),
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
