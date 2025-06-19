import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import {
    EXPERIENCE_GALLERY_IMAGE_MIN_COUNT,
    EXPERIENCE_GALLERY_IMAGE_MAX_COUNT,
    EXPERIENCE_IMAGE_TYPES,
    EXPERIENCE_IMAGES_MIN_COUNT,
    EXPERIENCE_IMAGES_MAX_COUNT,
} from "@/constants/experiences";
import ERRORS from "@/errors";

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

export const GetExperienceImageUploadUrlsSchema = z.object({
    experienceId: z
        .string({
            required_error: ERRORS.EXPERIENCE.ID.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.ID.INVALID_TYPE.CODE,
        })
        .uuid(ERRORS.EXPERIENCE.ID.INVALID_UUID.CODE),
    images: z
        .array(
            z.object({
                mimeType: z
                    .string({
                        required_error: "MISSING_MIME_TYPE",
                        invalid_type_error: "INVALID_MIME_TYPE_TYPE",
                    })
                    .refine(
                        (mimeType) => {
                            return (
                                mimeType.includes("/") &&
                                mimeType.startsWith("image/")
                            );
                        },
                        {
                            message: "INVALID_MIME_TYPE",
                        }
                    ),
                imageType: z.enum(
                    EXPERIENCE_IMAGE_TYPES as [string, ...string[]],
                    {
                        required_error:
                            ERRORS.EXPERIENCE.IMAGE_TYPE.MISSING.CODE,
                        invalid_type_error:
                            ERRORS.EXPERIENCE.IMAGE_TYPE.INVALID_TYPE.CODE,
                    }
                ),
            }),
            {
                required_error: ERRORS.EXPERIENCE.IMAGES.MISSING.CODE,
                invalid_type_error: ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE,
            }
        )
        .min(
            EXPERIENCE_IMAGES_MIN_COUNT,
            ERRORS.EXPERIENCE.IMAGES.MIN_COUNT.CODE
        )
        .max(
            EXPERIENCE_IMAGES_MAX_COUNT,
            ERRORS.EXPERIENCE.IMAGES.MAX_COUNT.CODE
        )
        .refine(
            (images) => {
                const galleryImages = images.filter(
                    (img) => img.imageType === "gallery"
                );
                return (
                    galleryImages.length <= EXPERIENCE_GALLERY_IMAGE_MAX_COUNT
                );
            },
            {
                message: `At most ${EXPERIENCE_GALLERY_IMAGE_MAX_COUNT} gallery images are allowed.`,
            }
        )
        .refine(
            (images) => {
                const coverImages = images.filter(
                    (img) => img.imageType === "cover"
                );
                return coverImages.length <= 1;
            },
            {
                message: "At most 1 cover image is allowed.",
            }
        )
        .refine(
            (images) => {
                const meetingLocationImages = images.filter(
                    (img) => img.imageType === "meeting-location"
                );
                return meetingLocationImages.length <= 1;
            },
            {
                message: "At most 1 meeting location image is allowed.",
            }
        ),
});
export type GetExperienceImageUploadUrlsData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof GetExperienceImageUploadUrlsSchema>;
};
