import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import {
    firstNameSchema,
    lastNameSchema,
    phoneNumberSchema,
    imageUrlSchema,
} from "./shared";

export const UserGetProfileSchema = z.object({});
export const UserUpdateProfileSchema = z
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

export type UserGetProfileData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof UserGetProfileSchema>;
};
export type UserUpdateProfileData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof UserUpdateProfileSchema>;
};
