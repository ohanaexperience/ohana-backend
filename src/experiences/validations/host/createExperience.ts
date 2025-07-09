import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import {
    EXPERIENCE_TITLE_MIN_LENGTH,
    EXPERIENCE_TITLE_MAX_LENGTH,
    EXPERIENCE_TAGLINE_MIN_LENGTH,
    EXPERIENCE_TAGLINE_MAX_LENGTH,
    EXPERIENCE_TYPE,
    EXPERIENCE_DESCRIPTION_MIN_LENGTH,
    EXPERIENCE_DESCRIPTION_MAX_LENGTH,
    EXPERIENCE_STARTING_LOCATION_ADDRESS_MIN_LENGTH,
    EXPERIENCE_STARTING_LOCATION_ADDRESS_MAX_LENGTH,
    EXPERIENCE_ENDING_LOCATION_ADDRESS_MIN_LENGTH,
    EXPERIENCE_ENDING_LOCATION_ADDRESS_MAX_LENGTH,
    EXPERIENCE_MEETING_INSTRUCTIONS_MIN_LENGTH,
    EXPERIENCE_MEETING_INSTRUCTIONS_MAX_LENGTH,
    EXPERIENCE_GROUP_DISCOUNT_PERCENTAGES_FOR_3_PLUS,
    EXPERIENCE_GROUP_DISCOUNT_PERCENTAGES_FOR_5_PLUS,
    EXPERIENCE_EARLY_BIRD_RATE_DISCOUNT_PERCENTAGES,
    EXPERIENCE_DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE,
    EXPERIENCE_CANCELLATION_POLICY,
    EXPERIENCE_GROUP_SIZE_MIN,
    EXPERIENCE_GROUP_SIZE_MAX,
    EXPERIENCE_INCLUDED_ITEMS,
    EXPERIENCE_WHAT_TO_BRING_MIN_LENGTH,
    EXPERIENCE_WHAT_TO_BRING_MAX_LENGTH,
    EXPERIENCE_PHYSICAL_REQUIREMENTS,
    EXPERIENCE_AGE_RECOMMENDATIONS,
    EXPERIENCE_ACCESSIBILITY_INFO_MIN_LENGTH,
    EXPERIENCE_ACCESSIBILITY_INFO_MAX_LENGTH,
    EXPERIENCE_DURATION_HOURS,
    EXPERIENCE_IMAGE_TYPES,
    EXPERIENCE_IMAGES_MIN_COUNT,
    EXPERIENCE_IMAGES_MAX_COUNT,
    EXPERIENCE_GALLERY_IMAGE_MAX_COUNT,
} from "@/constants/experiences";
import {
    LANGUAGES,
    IANA_TIMEZONES,
    IMAGE_MIME_TYPES,
} from "@/constants/shared";
import ERRORS from "@/errors";

// Schemas
export const CreateExperienceSchema = z.object({
    title: z
        .string({
            required_error: ERRORS.EXPERIENCE.TITLE.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.TITLE.INVALID_TYPE.CODE,
        })
        // .min(
        //     EXPERIENCE_TITLE_MIN_LENGTH,
        //     ERRORS.EXPERIENCE.TITLE.MIN_LENGTH.CODE
        // )
        .max(
            EXPERIENCE_TITLE_MAX_LENGTH,
            ERRORS.EXPERIENCE.TITLE.MAX_LENGTH.CODE
        ),
    tagline: z
        .string({
            required_error: ERRORS.EXPERIENCE.TAGLINE.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.TAGLINE.INVALID_TYPE.CODE,
        })
        // .min(
        //     EXPERIENCE_TAGLINE_MIN_LENGTH,
        //     ERRORS.EXPERIENCE.TAGLINE.MIN_LENGTH.CODE
        // )
        .max(
            EXPERIENCE_TAGLINE_MAX_LENGTH,
            ERRORS.EXPERIENCE.TAGLINE.MAX_LENGTH.CODE
        ),
    category: z.object(
        {
            mainId: z.number().int().positive(),
            subId: z.number().int().positive(),
        },
        {
            required_error: ERRORS.EXPERIENCE.CATEGORY.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.CATEGORY.INVALID_TYPE.CODE,
        }
    ),
    // Move this to endpoint to check
    // .refine(
    //     (data) => {
    //         const subCategory = SUB_CATEGORIES.find(
    //             (sub) => sub.slug === data.sub
    //         );
    //         return subCategory?.categorySlug === data.main;
    //     },
    //     {
    //         message: ERRORS.EXPERIENCE.CATEGORY.MISMATCH.CODE,
    //         path: ["sub"],
    //     }
    // ),
    languages: z.array(
        z.enum(LANGUAGES as [string, ...string[]], {
            errorMap: (issue, ctx) => {
                if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                    return {
                        message: ERRORS.LANGUAGES.INVALID_VALUE.CODE,
                    };
                }
                if (issue.code === z.ZodIssueCode.invalid_type) {
                    return {
                        message: ERRORS.LANGUAGES.INVALID_TYPE.CODE,
                    };
                }
                return { message: ctx.defaultError };
            },
        }),
        {
            required_error: ERRORS.LANGUAGES.MISSING.CODE,
            invalid_type_error: ERRORS.LANGUAGES.INVALID_TYPE.CODE,
        }
    ),
    experienceType: z.enum(EXPERIENCE_TYPE as [string, ...string[]], {
        errorMap: (issue, ctx) => {
            if (issue.code === z.ZodIssueCode.invalid_type) {
                if (issue.received === "undefined") {
                    return {
                        message: ERRORS.EXPERIENCE.TYPE.MISSING.CODE,
                    };
                }

                return {
                    message: ERRORS.EXPERIENCE.TYPE.INVALID_TYPE.CODE,
                };
            }
            if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                return {
                    message: ERRORS.EXPERIENCE.TYPE.INVALID_VALUE.CODE,
                };
            }
            return { message: ctx.defaultError };
        },
    }),
    description: z
        .string({
            required_error: ERRORS.EXPERIENCE.DESCRIPTION.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.DESCRIPTION.INVALID_TYPE.CODE,
        })
        // .min(
        //     EXPERIENCE_DESCRIPTION_MIN_LENGTH,
        //     ERRORS.EXPERIENCE.DESCRIPTION.MIN_LENGTH.CODE
        // )
        .max(
            EXPERIENCE_DESCRIPTION_MAX_LENGTH,
            ERRORS.EXPERIENCE.DESCRIPTION.MAX_LENGTH.CODE
        ),

    startingLocation: z.object(
        {
            address: z
                .string({
                    required_error:
                        ERRORS.EXPERIENCE.STARTING_LOCATION.ADDRESS.MISSING
                            .CODE,
                    invalid_type_error:
                        ERRORS.EXPERIENCE.STARTING_LOCATION.ADDRESS.INVALID_TYPE
                            .CODE,
                })
                // .min(
                //     EXPERIENCE_STARTING_LOCATION_ADDRESS_MIN_LENGTH,
                //     ERRORS.EXPERIENCE.STARTING_LOCATION.ADDRESS.MIN_LENGTH.CODE
                // )
                .max(
                    EXPERIENCE_STARTING_LOCATION_ADDRESS_MAX_LENGTH,
                    ERRORS.EXPERIENCE.STARTING_LOCATION.ADDRESS.MAX_LENGTH.CODE
                ),
            latitude: z.number({
                required_error:
                    ERRORS.EXPERIENCE.STARTING_LOCATION.LATITUDE.MISSING.CODE,
                invalid_type_error:
                    ERRORS.EXPERIENCE.STARTING_LOCATION.LATITUDE.INVALID_TYPE
                        .CODE,
            }),
            longitude: z.number({
                required_error:
                    ERRORS.EXPERIENCE.STARTING_LOCATION.LONGITUDE.MISSING.CODE,
                invalid_type_error:
                    ERRORS.EXPERIENCE.STARTING_LOCATION.LONGITUDE.INVALID_TYPE
                        .CODE,
            }),
        },
        {
            required_error: ERRORS.EXPERIENCE.STARTING_LOCATION.MISSING.CODE,
            invalid_type_error:
                ERRORS.EXPERIENCE.STARTING_LOCATION.INVALID_TYPE.CODE,
        }
    ),
    endingLocation: z.object(
        {
            address: z
                .string({
                    required_error:
                        ERRORS.EXPERIENCE.ENDING_LOCATION.ADDRESS.MISSING.CODE,
                    invalid_type_error:
                        ERRORS.EXPERIENCE.ENDING_LOCATION.ADDRESS.INVALID_TYPE
                            .CODE,
                })
                // .min(
                //     EXPERIENCE_ENDING_LOCATION_ADDRESS_MIN_LENGTH,
                //     ERRORS.EXPERIENCE.ENDING_LOCATION.ADDRESS.MIN_LENGTH.CODE
                // )
                .max(
                    EXPERIENCE_ENDING_LOCATION_ADDRESS_MAX_LENGTH,
                    ERRORS.EXPERIENCE.ENDING_LOCATION.ADDRESS.MAX_LENGTH.CODE
                ),
            latitude: z.number({
                required_error:
                    ERRORS.EXPERIENCE.ENDING_LOCATION.LATITUDE.MISSING.CODE,
                invalid_type_error:
                    ERRORS.EXPERIENCE.ENDING_LOCATION.LATITUDE.INVALID_TYPE
                        .CODE,
            }),
            longitude: z.number({
                required_error:
                    ERRORS.EXPERIENCE.ENDING_LOCATION.LONGITUDE.MISSING.CODE,
                invalid_type_error:
                    ERRORS.EXPERIENCE.ENDING_LOCATION.LONGITUDE.INVALID_TYPE
                        .CODE,
            }),
        },
        {
            required_error: ERRORS.EXPERIENCE.ENDING_LOCATION.MISSING.CODE,
            invalid_type_error:
                ERRORS.EXPERIENCE.ENDING_LOCATION.INVALID_TYPE.CODE,
        }
    ),
    meetingLocation: z.object(
        {
            instructions: z
                .string({
                    required_error:
                        ERRORS.EXPERIENCE.MEETING_LOCATION.INSTRUCTIONS.MISSING
                            .CODE,
                    invalid_type_error:
                        ERRORS.EXPERIENCE.MEETING_LOCATION.INSTRUCTIONS
                            .INVALID_TYPE.CODE,
                })
                // .min(
                //     EXPERIENCE_MEETING_INSTRUCTIONS_MIN_LENGTH,
                //     ERRORS.EXPERIENCE.MEETING_LOCATION.INSTRUCTIONS.MIN_LENGTH
                //         .CODE
                // )
                .max(
                    EXPERIENCE_MEETING_INSTRUCTIONS_MAX_LENGTH,
                    ERRORS.EXPERIENCE.MEETING_LOCATION.INSTRUCTIONS.MAX_LENGTH
                        .CODE
                ),
            // imageUrl: imageUrlSchema.optional(),
        },
        {
            required_error: ERRORS.EXPERIENCE.MEETING_LOCATION.MISSING.CODE,
            invalid_type_error:
                ERRORS.EXPERIENCE.MEETING_LOCATION.INVALID_TYPE.CODE,
        }
    ),

    pricePerPerson: z
        .number({
            required_error: ERRORS.EXPERIENCE.PRICE_PER_PERSON.MISSING.CODE,
            invalid_type_error:
                ERRORS.EXPERIENCE.PRICE_PER_PERSON.INVALID_TYPE.CODE,
        })
        .positive(ERRORS.EXPERIENCE.PRICE_PER_PERSON.POSITIVE.CODE)
        .refine(
            (val) => Number.isInteger(val) && !val.toString().includes("."),
            ERRORS.EXPERIENCE.PRICE_PER_PERSON.INTEGER.CODE
        ),
    groupDiscounts: z
        .object(
            {
                discountPercentageFor3Plus: z
                    .number({
                        invalid_type_error:
                            ERRORS.EXPERIENCE
                                .GROUP_DISCOUNT_PERCENTAGE_FOR_3_PLUS
                                .INVALID_TYPE.CODE,
                    })
                    .refine(
                        (val) =>
                            EXPERIENCE_GROUP_DISCOUNT_PERCENTAGES_FOR_3_PLUS.includes(
                                val
                            ),
                        {
                            message:
                                ERRORS.EXPERIENCE
                                    .GROUP_DISCOUNT_PERCENTAGE_FOR_3_PLUS
                                    .INVALID_VALUE.CODE,
                        }
                    )
                    .optional(),
                discountPercentageFor5Plus: z
                    .number({
                        invalid_type_error:
                            ERRORS.EXPERIENCE
                                .GROUP_DISCOUNT_PERCENTAGE_FOR_5_PLUS
                                .INVALID_TYPE.CODE,
                    })
                    .refine(
                        (val) =>
                            EXPERIENCE_GROUP_DISCOUNT_PERCENTAGES_FOR_5_PLUS.includes(
                                val
                            ),
                        {
                            message:
                                ERRORS.EXPERIENCE
                                    .GROUP_DISCOUNT_PERCENTAGE_FOR_5_PLUS
                                    .INVALID_VALUE.CODE,
                        }
                    )
                    .optional(),
            },
            {
                invalid_type_error:
                    ERRORS.EXPERIENCE.GROUP_DISCOUNTS.INVALID_TYPE.CODE,
            }
        )
        .refine(
            (data) => {
                return (
                    data.discountPercentageFor3Plus !== undefined ||
                    data.discountPercentageFor5Plus !== undefined
                );
            },
            {
                message:
                    ERRORS.EXPERIENCE.GROUP_DISCOUNTS.AT_LEAST_ONE_REQUIRED
                        .CODE,
                path: ["groupDiscounts"],
            }
        )
        .optional(),
    earlyBirdRate: z
        .object(
            {
                discountPercentage: z
                    .number({
                        invalid_type_error:
                            ERRORS.EXPERIENCE
                                .EARLY_BIRD_RATE_DISCOUNT_PERCENTAGE
                                .INVALID_TYPE.CODE,
                    })
                    .refine(
                        (val) =>
                            EXPERIENCE_EARLY_BIRD_RATE_DISCOUNT_PERCENTAGES.includes(
                                val
                            ),
                        {
                            message:
                                ERRORS.EXPERIENCE
                                    .EARLY_BIRD_RATE_DISCOUNT_PERCENTAGE
                                    .INVALID_VALUE.CODE,
                        }
                    )
                    .optional(),
                daysInAdvance: z
                    .number({
                        invalid_type_error:
                            ERRORS.EXPERIENCE
                                .DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE
                                .INVALID_TYPE.CODE,
                    })
                    .refine(
                        (val) =>
                            EXPERIENCE_DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE.includes(
                                val
                            ),
                        {
                            message:
                                ERRORS.EXPERIENCE
                                    .DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE
                                    .INVALID_VALUE.CODE,
                        }
                    )
                    .optional(),
            },
            {
                invalid_type_error:
                    ERRORS.EXPERIENCE.EARLY_BIRD_RATE.INVALID_TYPE.CODE,
            }
        )
        .optional(),
    cancellationPolicy: z.enum(
        EXPERIENCE_CANCELLATION_POLICY.map((policy) => policy) as [
            string,
            ...string[]
        ],
        {
            errorMap: (issue, ctx) => {
                if (issue.code === z.ZodIssueCode.invalid_type) {
                    if (issue.received === "undefined") {
                        return {
                            message:
                                ERRORS.EXPERIENCE.CANCELLATION_POLICY.MISSING
                                    .CODE,
                        };
                    }

                    return {
                        message:
                            ERRORS.EXPERIENCE.CANCELLATION_POLICY.INVALID_TYPE
                                .CODE,
                    };
                }
                if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                    return {
                        message:
                            ERRORS.EXPERIENCE.CANCELLATION_POLICY.INVALID_VALUE
                                .CODE,
                    };
                }
                return { message: ctx.defaultError };
            },
        }
    ),
    groupSize: z.object(
        {
            minGuests: z
                .number({
                    required_error:
                        ERRORS.EXPERIENCE.GROUP_SIZE_MIN_GUESTS.MISSING.CODE,
                    invalid_type_error:
                        ERRORS.EXPERIENCE.GROUP_SIZE_MIN_GUESTS.INVALID_TYPE
                            .CODE,
                })
                .min(
                    EXPERIENCE_GROUP_SIZE_MIN,
                    ERRORS.EXPERIENCE.GROUP_SIZE_MIN_GUESTS.MIN_VALUE.CODE
                ),
            maxGuests: z
                .number({
                    required_error:
                        ERRORS.EXPERIENCE.GROUP_SIZE_MAX_GUESTS.MISSING.CODE,
                    invalid_type_error:
                        ERRORS.EXPERIENCE.GROUP_SIZE_MAX_GUESTS.INVALID_TYPE
                            .CODE,
                })
                .max(
                    EXPERIENCE_GROUP_SIZE_MAX,
                    ERRORS.EXPERIENCE.GROUP_SIZE_MAX_GUESTS.MAX_VALUE.CODE
                ),
            autoCancelEnabled: z
                .boolean({
                    invalid_type_error:
                        ERRORS.EXPERIENCE.GROUP_SIZE_AUTO_CANCEL_ENABLED
                            .INVALID_TYPE.CODE,
                })
                .optional()
                .default(false),
        },
        {
            required_error: ERRORS.EXPERIENCE.GROUP_SIZE.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.GROUP_SIZE.INVALID_TYPE.CODE,
        }
    ),

    // coverImageUrl: z
    //     .string({
    //         required_error: ERRORS.EXPERIENCE.COVER_IMAGE_URL.MISSING.CODE,
    //         invalid_type_error:
    //             ERRORS.EXPERIENCE.COVER_IMAGE_URL.INVALID_TYPE.CODE,
    //     })
    //     .url(ERRORS.EXPERIENCE.COVER_IMAGE_URL.INVALID.CODE),
    // galleryImageUrls: z
    //     .array(
    //         z
    //             .string({
    //                 required_error:
    //                     ERRORS.EXPERIENCE.GALLERY_IMAGE_URL.MISSING.CODE,
    //                 invalid_type_error:
    //                     ERRORS.EXPERIENCE.GALLERY_IMAGE_URL.INVALID_TYPE.CODE,
    //             })
    //             .url(ERRORS.EXPERIENCE.GALLERY_IMAGE_URL.INVALID.CODE),
    //         {
    //             invalid_type_error:
    //                 ERRORS.EXPERIENCE.GALLERY_IMAGE_URLS.INVALID_TYPE.CODE,
    //         }
    //     )
    //     .optional(),

    includedItems: z
        .array(
            z.enum(
                EXPERIENCE_INCLUDED_ITEMS.map((item) => item) as [
                    string,
                    ...string[]
                ],
                {
                    errorMap: (issue, ctx) => {
                        if (issue.code === z.ZodIssueCode.invalid_type) {
                            if (issue.received === "undefined") {
                                return {
                                    message:
                                        ERRORS.EXPERIENCE.INCLUDED_ITEMS.MISSING
                                            .CODE,
                                };
                            }

                            return {
                                message:
                                    ERRORS.EXPERIENCE.INCLUDED_ITEMS
                                        .INVALID_TYPE.CODE,
                            };
                        }
                        if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                            return {
                                message:
                                    ERRORS.EXPERIENCE.INCLUDED_ITEMS
                                        .INVALID_VALUE.CODE,
                            };
                        }
                        return { message: ctx.defaultError };
                    },
                }
            )
        )
        .optional(),
    whatToBring: z
        .string({
            invalid_type_error:
                ERRORS.EXPERIENCE.WHAT_TO_BRING.INVALID_TYPE.CODE,
        })
        // .min(
        //     EXPERIENCE_WHAT_TO_BRING_MIN_LENGTH,
        //     ERRORS.EXPERIENCE.WHAT_TO_BRING.MIN_LENGTH.CODE
        // )
        .max(
            EXPERIENCE_WHAT_TO_BRING_MAX_LENGTH,
            ERRORS.EXPERIENCE.WHAT_TO_BRING.MAX_LENGTH.CODE
        )
        .optional(),
    physicalRequirements: z.enum(
        EXPERIENCE_PHYSICAL_REQUIREMENTS.map((requirement) => requirement) as [
            string,
            ...string[]
        ],
        {
            errorMap: (issue, ctx) => {
                if (issue.code === z.ZodIssueCode.invalid_type) {
                    if (issue.received === "undefined") {
                        return {
                            message:
                                ERRORS.EXPERIENCE.PHYSICAL_REQUIREMENTS.MISSING
                                    .CODE,
                        };
                    }
                    return {
                        message:
                            ERRORS.EXPERIENCE.PHYSICAL_REQUIREMENTS.INVALID_TYPE
                                .CODE,
                    };
                }
                if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                    return {
                        message:
                            ERRORS.EXPERIENCE.PHYSICAL_REQUIREMENTS
                                .INVALID_VALUE.CODE,
                    };
                }
                return { message: ctx.defaultError };
            },
        }
    ),
    ageRecommendations: z.enum(
        EXPERIENCE_AGE_RECOMMENDATIONS.map((age) => age) as [
            string,
            ...string[]
        ],
        {
            errorMap: (issue, ctx) => {
                if (issue.code === z.ZodIssueCode.invalid_type) {
                    if (issue.received === "undefined") {
                        return {
                            message:
                                ERRORS.EXPERIENCE.AGE_RECOMMENDATIONS.MISSING
                                    .CODE,
                        };
                    }

                    return {
                        message:
                            ERRORS.EXPERIENCE.AGE_RECOMMENDATIONS.INVALID_TYPE
                                .CODE,
                    };
                }
                if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                    return {
                        message:
                            ERRORS.EXPERIENCE.AGE_RECOMMENDATIONS.INVALID_VALUE
                                .CODE,
                    };
                }
                return { message: ctx.defaultError };
            },
        }
    ),
    accessibilityInfo: z
        .string({
            required_error: ERRORS.EXPERIENCE.ACCESSIBILITY_INFO.MISSING.CODE,
            invalid_type_error:
                ERRORS.EXPERIENCE.ACCESSIBILITY_INFO.INVALID_TYPE.CODE,
        })
        // .min(
        //     EXPERIENCE_ACCESSIBILITY_INFO_MIN_LENGTH,
        //     ERRORS.EXPERIENCE.ACCESSIBILITY_INFO.MIN_LENGTH.CODE
        // )
        .max(
            EXPERIENCE_ACCESSIBILITY_INFO_MAX_LENGTH,
            ERRORS.EXPERIENCE.ACCESSIBILITY_INFO.MAX_LENGTH.CODE
        ),

    durationHours: z
        .number({
            required_error: ERRORS.EXPERIENCE.DURATION_HOURS.MISSING.CODE,
            invalid_type_error:
                ERRORS.EXPERIENCE.DURATION_HOURS.INVALID_TYPE.CODE,
        })
        .refine((val) => EXPERIENCE_DURATION_HOURS.includes(val), {
            message: ERRORS.EXPERIENCE.DURATION_HOURS.INVALID_VALUE.CODE,
        }),
    timezone: z.enum(
        IANA_TIMEZONES.map((timezone) => timezone) as [string, ...string[]],
        {
            errorMap: (issue, ctx) => {
                if (issue.code === z.ZodIssueCode.invalid_type) {
                    if (issue.received === "undefined") {
                        return {
                            message: ERRORS.EXPERIENCE.TIMEZONE.MISSING.CODE,
                        };
                    }

                    return {
                        message: ERRORS.EXPERIENCE.TIMEZONE.INVALID_TYPE.CODE,
                    };
                }
                if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                    return {
                        message: ERRORS.EXPERIENCE.TIMEZONE.INVALID_VALUE.CODE,
                    };
                }
                return { message: ctx.defaultError };
            },
        }
    ),
    availability: z.object(
        {
            startDate: z
                .string({
                    required_error:
                        ERRORS.EXPERIENCE.AVAILABILITY_START_DATE.MISSING.CODE,
                    invalid_type_error:
                        ERRORS.EXPERIENCE.AVAILABILITY_START_DATE.INVALID_TYPE
                            .CODE,
                })
                .date(
                    ERRORS.EXPERIENCE.AVAILABILITY_START_DATE.INVALID_VALUE.CODE
                ),
            endDate: z
                .string({
                    required_error:
                        ERRORS.EXPERIENCE.AVAILABILITY_END_DATE.MISSING.CODE,
                    invalid_type_error:
                        ERRORS.EXPERIENCE.AVAILABILITY_END_DATE.INVALID_TYPE
                            .CODE,
                })
                .date(
                    ERRORS.EXPERIENCE.AVAILABILITY_END_DATE.INVALID_VALUE.CODE
                )
                .optional(),

            daysOfWeek: z
                .array(
                    z
                        .number({
                            required_error:
                                ERRORS.EXPERIENCE.AVAILABILITY_SPECIFIC_DAY
                                    .MISSING.CODE,
                            invalid_type_error:
                                ERRORS.EXPERIENCE.AVAILABILITY_SPECIFIC_DAY
                                    .INVALID_TYPE.CODE,
                        })
                        .min(
                            0,
                            ERRORS.EXPERIENCE.AVAILABILITY_SPECIFIC_DAY
                                .MIN_VALUE.CODE
                        )
                        .max(
                            6,
                            ERRORS.EXPERIENCE.AVAILABILITY_SPECIFIC_DAY
                                .MAX_VALUE.CODE
                        ),
                    {
                        required_error:
                            ERRORS.EXPERIENCE.AVAILABILITY_DAYS_OF_WEEK.MISSING
                                .CODE,
                        invalid_type_error:
                            ERRORS.EXPERIENCE.AVAILABILITY_DAYS_OF_WEEK
                                .INVALID_TYPE.CODE,
                    }
                )
                .min(
                    1,
                    ERRORS.EXPERIENCE.AVAILABILITY_DAYS_OF_WEEK.MIN_LENGTH.CODE
                )
                .refine((days) => new Set(days).size === days.length, {
                    message:
                        ERRORS.EXPERIENCE.AVAILABILITY_DAYS_OF_WEEK
                            .DUPLICATE_VALUES.CODE,
                })
                .optional(),
            timeSlots: z
                .array(
                    z
                        .string({
                            required_error:
                                ERRORS.EXPERIENCE.AVAILABILITY_SPECIFIC_TIME
                                    .MISSING.CODE,
                            invalid_type_error:
                                ERRORS.EXPERIENCE.AVAILABILITY_SPECIFIC_TIME
                                    .INVALID_TYPE.CODE,
                        })
                        .regex(
                            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                            ERRORS.EXPERIENCE.AVAILABILITY_SPECIFIC_TIME
                                .INVALID_VALUE.CODE
                        ),
                    {
                        required_error:
                            ERRORS.EXPERIENCE.AVAILABILITY_TIME_SLOTS.MISSING
                                .CODE,
                        invalid_type_error:
                            ERRORS.EXPERIENCE.AVAILABILITY_TIME_SLOTS
                                .INVALID_TYPE.CODE,
                    }
                )
                .min(
                    1,
                    ERRORS.EXPERIENCE.AVAILABILITY_TIME_SLOTS.MIN_LENGTH.CODE
                ),
        },
        {
            required_error: ERRORS.EXPERIENCE.AVAILABILITY.MISSING.CODE,
            invalid_type_error:
                ERRORS.EXPERIENCE.AVAILABILITY.INVALID_TYPE.CODE,
        }
    ),
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
export const CreateExperienceRequestSchema = z.object({
    authorization: z.string({
        required_error: ERRORS.AUTHORIZATION.MISSING.CODE,
        invalid_type_error: ERRORS.AUTHORIZATION.INVALID_TYPE.CODE,
    }),
    ...CreateExperienceSchema.shape,
});

// Types
export type CreateExperienceData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof CreateExperienceSchema>;
};
export type CreateExperienceRequest = z.infer<
    typeof CreateExperienceRequestSchema
>;
