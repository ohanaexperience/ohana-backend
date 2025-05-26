import { z } from "zod";
import { APIGatewayEvent } from "aws-lambda";

import ERRORS from "../errors";
import { imageUrlSchema } from "./base";

import {
    EXPERIENCE_TITLE_MIN_LENGTH,
    EXPERIENCE_TITLE_MAX_LENGTH,
    EXPERIENCE_TAGLINE_MIN_LENGTH,
    EXPERIENCE_TAGLINE_MAX_LENGTH,
} from "../experiences";

export const CreateExperienceSchema = z.object({
    title: z
        .string({
            required_error: ERRORS.EXPERIENCE.TITLE.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.TITLE.INVALID_TYPE.CODE,
        })
        .min(
            EXPERIENCE_TITLE_MIN_LENGTH,
            ERRORS.EXPERIENCE.TITLE.MIN_LENGTH.CODE
        )
        .max(
            EXPERIENCE_TITLE_MAX_LENGTH,
            ERRORS.EXPERIENCE.TITLE.MAX_LENGTH.CODE
        ),
    tagline: z
        .string({
            required_error: ERRORS.EXPERIENCE.TAGLINE.MISSING.CODE,
            invalid_type_error: ERRORS.EXPERIENCE.TAGLINE.INVALID_TYPE.CODE,
        })
        .min(
            EXPERIENCE_TAGLINE_MIN_LENGTH,
            ERRORS.EXPERIENCE.TAGLINE.MIN_LENGTH.CODE
        )
        .max(
            EXPERIENCE_TAGLINE_MAX_LENGTH,
            ERRORS.EXPERIENCE.TAGLINE.MAX_LENGTH.CODE
        ),
    category: z.object({
        main: z
            .string({
                required_error: "MISSING_CATEGORY",
                invalid_type_error: "INVALID_CATEGORY_TYPE",
            })
            .min(1, "Category is required"),
        sub: z
            .string({
                invalid_type_error: "INVALID_SUBCATEGORY_TYPE",
            })
            .optional(),
    }),
    languages: z
        .array(
            z.string({
                required_error: "MISSING_LANGUAGES",
                invalid_type_error: "INVALID_LANGUAGES_TYPE",
            })
        )
        .min(1, "Languages are required."),
    experienceType: z.enum(["indoor", "outdoor", "both"]),
    description: z
        .string({
            required_error: "MISSING_DESCRIPTION",
            invalid_type_error: "INVALID_DESCRIPTION_TYPE",
        })
        .min(1, "Description is required."),

    startingLocation: z.object({
        address: z
            .string({
                required_error: "MISSING_STARTING_LOCATION_ADDRESS",
                invalid_type_error: "INVALID_STARTING_LOCATION_ADDRESS_TYPE",
            })
            .min(1, "Starting location address is required."),
        latitude: z.number({
            required_error: "MISSING_STARTING_LOCATION_LATITUDE",
            invalid_type_error: "INVALID_STARTING_LOCATION_LATITUDE_TYPE",
        }),
        longitude: z.number({
            required_error: "MISSING_STARTING_LOCATION_LONGITUDE",
            invalid_type_error: "INVALID_STARTING_LOCATION_LONGITUDE_TYPE",
        }),
    }),
    endingLocation: z.object({
        address: z
            .string({
                required_error: "MISSING_STARTING_LOCATION_ADDRESS",
                invalid_type_error: "INVALID_STARTING_LOCATION_ADDRESS_TYPE",
            })
            .min(1, "Starting location address is required."),
        latitude: z.number({
            required_error: "MISSING_STARTING_LOCATION_LATITUDE",
            invalid_type_error: "INVALID_STARTING_LOCATION_LATITUDE_TYPE",
        }),
        longitude: z.number({
            required_error: "MISSING_STARTING_LOCATION_LONGITUDE",
            invalid_type_error: "INVALID_STARTING_LOCATION_LONGITUDE_TYPE",
        }),
    }),
    meeting: z.object({
        instructions: z
            .string({
                required_error: "MISSING_MEETING_INSTRUCTIONS",
                invalid_type_error: "INVALID_MEETING_INSTRUCTIONS_TYPE",
            })
            .min(1, "Meeting instructions are required."),
        locationImageUrl: imageUrlSchema.optional(),
    }),

    pricePerPerson: z.number({
        required_error: "MISSING_PRICE_PER_PERSON",
        invalid_type_error: "INVALID_PRICE_PER_PERSON_TYPE",
    }),
    groupDiscounts: z
        .object({
            enabled: z.boolean(),
            discountPercentageFor3Plus: z.union([
                z.literal(5),
                z.literal(10),
                z.literal(15),
                z.literal(20),
                z.literal(25),
            ]),
            discountPercentageFor5Plus: z.union([
                z.literal(10),
                z.literal(15),
                z.literal(20),
                z.literal(25),
                z.literal(30),
            ]),
        })
        .optional(),
    earlyBirdRate: z
        .object({
            enabled: z.boolean(),
            discountPercentage: z.union([
                z.literal(5),
                z.literal(10),
                z.literal(15),
                z.literal(20),
                z.literal(25),
            ]),
            daysInAdvance: z
                .number()
                .min(1, "Days in advance must be greater than 0."),
        })
        .optional(),
    cancellationPolicy: z.enum(["strict", "moderate", "flexible"]),
    groupSize: z.object({
        minGuests: z.number().min(1, "Minimum guests must be greater than 0."),
        maxGuests: z.number().min(1, "Maximum guests must be greater than 0."),
        autoCancelEnabled: z.boolean(),
        autoCancelHours: z
            .number()
            .min(1, "Auto cancel hours must be greater than 0."),
    }),

    coverImageUrl: imageUrlSchema,
    galleryImageUrls: z.array(imageUrlSchema),

    includedItems: z
        .array(z.enum(["food", "drinks", "transport", "equipment"]))
        .optional(),
    whatToBring: z.string(),
    physicalRequirements: z.enum(["low", "medium", "high"]).optional(),
    ageRecommendations: z.object({
        range: z.enum(["18-25", "26-35", "36-45", "46-55", "56-65", "66+"]),
        accessibilityInfo: z.string(),
    }),

    experienceDuration: z.enum([
        "1-2 hours",
        "2-3 hours",
        "3-4 hours",
        "4-5 hours",
        "5-6 hours",
    ]),
    availability: z.object({
        isRecurring: z.boolean(),
        recurring: z
            .object({
                daysOfWeek: z.array(z.number().min(0).max(6)),
                timeSlots: z.array(z.string()),
                startDate: z.string(),
                endDate: z.string(),
                endCondition: z.string().optional(),
            })
            .optional(),
        oneTime: z
            .object({
                date: z.date(),
                timeSlots: z.array(z.date()),
            })
            .optional(),
    }),
});
// .refine(
//     (data) => {
//         return (
//             (data.availability.isRecurring &&
//                 data.availability.recurring) ||
//             (!data.availability.isRecurring && data.availability.oneTime)
//         );
//     },
//     {
//         message:
//             "Either recurring or one-time availability must be provided.",
//         path: ["availability"],
//     }
// );

export type CreateExperienceData = Omit<APIGatewayEvent, "body"> & {
    body: z.infer<typeof CreateExperienceSchema>;
};
