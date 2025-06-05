import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import {
    firstNameSchema,
    lastNameSchema,
    phoneNumberSchema,
    imageUrlSchema,
} from "@/validations/shared";
import ERRORS from "@/errors";

export const UpdateUserProfileSchema = z
    .object({
        firstName: firstNameSchema.optional(),
        lastName: lastNameSchema.optional(),
        phoneNumber: phoneNumberSchema.optional(),
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
export const GetProfileImageUploadUrlSchema = z.object({
    mimeType: z
        .string({
            required_error: ERRORS.MIME_TYPE.MISSING.CODE,
            invalid_type_error: ERRORS.MIME_TYPE.INVALID_TYPE.CODE,
        })
        .refine(
            (mimeType) => {
                return mimeType.includes("/") && mimeType.startsWith("image/");
            },
            {
                message: ERRORS.MIME_TYPE.INVALID_IMAGE_TYPE.CODE,
            }
        ),
});

export type UpdateUserProfileData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof UpdateUserProfileSchema>;
};
export type GetProfileImageUploadUrlData = Omit<
    APIGatewayEvent,
    "queryStringParameters"
> & {
    queryStringParameters: z.infer<typeof GetProfileImageUploadUrlSchema>;
};
