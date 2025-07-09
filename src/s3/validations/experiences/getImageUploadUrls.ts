import { z } from "zod";

import { APIGatewayEvent } from "aws-lambda";

import {
    EXPERIENCE_GALLERY_IMAGE_MIN_COUNT,
    EXPERIENCE_GALLERY_IMAGE_MAX_COUNT,
    EXPERIENCE_IMAGE_TYPES,
    EXPERIENCE_IMAGES_MIN_COUNT,
    EXPERIENCE_IMAGES_MAX_COUNT,
} from "@/constants/experiences";
import { IMAGE_MIME_TYPES } from "@/constants/shared";
import ERRORS from "@/errors";

// Schemas
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
                        required_error: ERRORS.MIME_TYPE.MISSING.CODE,
                        invalid_type_error: ERRORS.MIME_TYPE.INVALID_TYPE.CODE,
                    })
                    .refine(
                        (mimeType) => {
                            return IMAGE_MIME_TYPES.includes(mimeType);
                        },
                        {
                            message: ERRORS.MIME_TYPE.INVALID_IMAGE_TYPE.CODE,
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
export const GetExperienceImageUploadUrlsRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...GetExperienceImageUploadUrlsSchema.shape,
});

// Types
export type GetExperienceImageUploadUrlsData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof GetExperienceImageUploadUrlsSchema>;
};
export type GetExperienceImageUploadUrlsRequest = z.infer<
    typeof GetExperienceImageUploadUrlsRequestSchema
>;
