import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

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

export type UpdateHostProfileData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof UpdateHostProfileSchema>;
};
