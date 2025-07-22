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
    EXPERIENCE_AGE_RECOMMENDATIONS,
    EXPERIENCE_DURATION_HOURS,
    EXPERIENCE_IMAGE_TYPES,
    EXPERIENCE_IMAGES_MIN_COUNT,
    EXPERIENCE_IMAGES_MAX_COUNT,
} from "@/constants/experiences";
import { CATEGORIES, SUB_CATEGORIES } from "@/constants/categories";
import { IANA_TIMEZONES } from "@/constants/shared";

export default {
    EXPERIENCE: {
        NOT_FOUND: {
            CODE: "EXPERIENCE_NOT_FOUND",
            MESSAGE: "Experience not found.",
        },
        ID: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_ID",
                MESSAGE: "Experience ID is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_ID_TYPE",
                MESSAGE: "Experience ID must be a string.",
            },
            INVALID_UUID: {
                CODE: "INVALID_EXPERIENCE_ID_UUID",
                MESSAGE: "Experience ID must be a valid UUID.",
            },
        },
        TITLE: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_TITLE",
                MESSAGE: "Experience title is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_TITLE_TYPE",
                MESSAGE: "Experience title must be a string.",
            },
            MIN_LENGTH: {
                CODE: "INVALID_EXPERIENCE_TITLE_MIN_LENGTH",
                MESSAGE: `Experience title must be at least ${EXPERIENCE_TITLE_MIN_LENGTH} characters.`,
            },
            MAX_LENGTH: {
                CODE: "INVALID_EXPERIENCE_TITLE_MAX_LENGTH",
                MESSAGE: `Experience title must be less than ${EXPERIENCE_TITLE_MAX_LENGTH} characters.`,
            },
        },
        TAGLINE: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_TAGLINE",
                MESSAGE: "Experience tagline is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_TAGLINE_TYPE",
                MESSAGE: "Experience tagline must be a string.",
            },
            MIN_LENGTH: {
                CODE: "INVALID_EXPERIENCE_TAGLINE_MIN_LENGTH",
                MESSAGE: `Experience tagline must be at least ${EXPERIENCE_TAGLINE_MIN_LENGTH} characters.`,
            },
            MAX_LENGTH: {
                CODE: "INVALID_EXPERIENCE_TAGLINE_MAX_LENGTH",
                MESSAGE: `Experience tagline must be less than ${EXPERIENCE_TAGLINE_MAX_LENGTH} characters.`,
            },
        },
        CATEGORY: {
            MISSING: {
                CODE: "MISSING_CATEGORY",
                MESSAGE: "Category is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_CATEGORY_TYPE",
                MESSAGE: "Category must be an object.",
            },
            MISMATCH: {
                CODE: "SUBCATEGORY_CATEGORY_MISMATCH",
                MESSAGE: "Subcategory must be from the same category.",
            },
            MAIN: {
                MISSING: {
                    CODE: "MISSING_MAIN_CATEGORY",
                    MESSAGE: "Main category is required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_MAIN_CATEGORY_TYPE",
                    MESSAGE: "Main category must be a string.",
                },
                INVALID_VALUE: {
                    CODE: "INVALID_MAIN_CATEGORY_VALUE",
                    MESSAGE: `Invalid main category. Must be one of the following: ${CATEGORIES.map(
                        (cat) => cat.slug
                    ).join(", ")}`,
                },
            },
            SUB: {
                MISSING: {
                    CODE: "MISSING_SUB_CATEGORY",
                    MESSAGE: "Sub category is required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_SUB_CATEGORY_TYPE",
                    MESSAGE: "Sub category must be a string.",
                },
                INVALID_VALUE: {
                    CODE: "INVALID_SUB_CATEGORY_VALUE",
                    MESSAGE: `Invalid sub category. Must be one of the following: ${SUB_CATEGORIES.map(
                        (cat) => cat.slug
                    ).join(", ")}`,
                },
            },
        },
        TYPE: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_TYPE",
                MESSAGE: "Experience type is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_TYPE",
                MESSAGE: "Experience type must be a string.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_TYPE_VALUE",
                MESSAGE: `Invalid experience type. Must be one of the following: ${EXPERIENCE_TYPE.map(
                    (type) => type
                ).join(", ")}`,
            },
        },
        DESCRIPTION: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_DESCRIPTION",
                MESSAGE: "Experience description is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_DESCRIPTION_TYPE",
                MESSAGE: "Experience description must be a string.",
            },
            MIN_LENGTH: {
                CODE: "INVALID_EXPERIENCE_DESCRIPTION_MIN_LENGTH",
                MESSAGE: `Experience description must be at least ${EXPERIENCE_DESCRIPTION_MIN_LENGTH} characters.`,
            },
            MAX_LENGTH: {
                CODE: "INVALID_EXPERIENCE_DESCRIPTION_MAX_LENGTH",
                MESSAGE: `Experience description must be less than ${EXPERIENCE_DESCRIPTION_MAX_LENGTH} characters.`,
            },
        },
        STARTING_LOCATION: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_STARTING_LOCATION",
                MESSAGE: "Experience starting location is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_STARTING_LOCATION_TYPE",
                MESSAGE: "Experience starting location must be an object.",
            },
            ADDRESS: {
                MISSING: {
                    CODE: "MISSING_EXPERIENCE_STARTING_LOCATION_ADDRESS",
                    MESSAGE:
                        "Experience starting location address is required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_EXPERIENCE_STARTING_LOCATION_ADDRESS_TYPE",
                    MESSAGE:
                        "Experience starting location address must be a string.",
                },
                MIN_LENGTH: {
                    CODE: "INVALID_EXPERIENCE_STARTING_LOCATION_ADDRESS_MIN_LENGTH",
                    MESSAGE: `Experience starting location address must be at least ${EXPERIENCE_STARTING_LOCATION_ADDRESS_MIN_LENGTH} characters.`,
                },
                MAX_LENGTH: {
                    CODE: "INVALID_EXPERIENCE_STARTING_LOCATION_ADDRESS_MAX_LENGTH",
                    MESSAGE: `Experience starting location address must be less than ${EXPERIENCE_STARTING_LOCATION_ADDRESS_MAX_LENGTH} characters.`,
                },
            },
            LATITUDE: {
                MISSING: {
                    CODE: "MISSING_EXPERIENCE_STARTING_LOCATION_LATITUDE",
                    MESSAGE:
                        "Experience starting location latitude is required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_EXPERIENCE_STARTING_LOCATION_LATITUDE_TYPE",
                    MESSAGE:
                        "Experience starting location latitude must be a number.",
                },
            },
            LONGITUDE: {
                MISSING: {
                    CODE: "MISSING_EXPERIENCE_STARTING_LOCATION_LONGITUDE",
                    MESSAGE:
                        "Experience starting location longitude is required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_EXPERIENCE_STARTING_LOCATION_LONGITUDE_TYPE",
                    MESSAGE:
                        "Experience starting location longitude must be a number.",
                },
            },
        },
        ENDING_LOCATION: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_ENDING_LOCATION",
                MESSAGE: "Experience ending location is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_ENDING_LOCATION_TYPE",
                MESSAGE: "Experience ending location must be an object.",
            },
            ADDRESS: {
                MISSING: {
                    CODE: "MISSING_EXPERIENCE_ENDING_LOCATION_ADDRESS",
                    MESSAGE: "Experience ending location address is required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_EXPERIENCE_ENDING_LOCATION_ADDRESS_TYPE",
                    MESSAGE:
                        "Experience ending location address must be a string.",
                },
                MIN_LENGTH: {
                    CODE: "INVALID_EXPERIENCE_ENDING_LOCATION_ADDRESS_MIN_LENGTH",
                    MESSAGE: `Experience ending location address must be at least ${EXPERIENCE_ENDING_LOCATION_ADDRESS_MIN_LENGTH} characters.`,
                },
                MAX_LENGTH: {
                    CODE: "INVALID_EXPERIENCE_ENDING_LOCATION_ADDRESS_MAX_LENGTH",
                    MESSAGE: `Experience ending location address must be less than ${EXPERIENCE_ENDING_LOCATION_ADDRESS_MAX_LENGTH} characters.`,
                },
            },
            LATITUDE: {
                MISSING: {
                    CODE: "MISSING_EXPERIENCE_ENDING_LOCATION_LATITUDE",
                    MESSAGE: "Experience ending location latitude is required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_EXPERIENCE_ENDING_LOCATION_LATITUDE_TYPE",
                    MESSAGE:
                        "Experience ending location latitude must be a number.",
                },
            },
            LONGITUDE: {
                MISSING: {
                    CODE: "MISSING_EXPERIENCE_ENDING_LOCATION_LONGITUDE",
                    MESSAGE:
                        "Experience ending location longitude is required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_EXPERIENCE_ENDING_LOCATION_LONGITUDE_TYPE",
                    MESSAGE:
                        "Experience ending location longitude must be a number.",
                },
            },
        },
        MEETING_LOCATION: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_MEETING_LOCATION",
                MESSAGE: "Experience meeting location is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_MEETING_LOCATION_TYPE",
                MESSAGE: "Experience meeting location must be an object.",
            },
            INSTRUCTIONS: {
                MISSING: {
                    CODE: "MISSING_EXPERIENCE_MEETING_LOCATION_INSTRUCTIONS",
                    MESSAGE:
                        "Experience meeting location instructions are required.",
                },
                INVALID_TYPE: {
                    CODE: "INVALID_EXPERIENCE_MEETING_LOCATION_INSTRUCTIONS_TYPE",
                    MESSAGE:
                        "Experience meeting location instructions must be a string.",
                },
                MIN_LENGTH: {
                    CODE: "INVALID_EXPERIENCE_MEETING_LOCATION_INSTRUCTIONS_MIN_LENGTH",
                    MESSAGE: `Experience meeting location instructions must be at least ${EXPERIENCE_MEETING_INSTRUCTIONS_MIN_LENGTH} characters.`,
                },
                MAX_LENGTH: {
                    CODE: "INVALID_EXPERIENCE_MEETING_LOCATION_INSTRUCTIONS_MAX_LENGTH",
                    MESSAGE: `Experience meeting location instructions must be less than ${EXPERIENCE_MEETING_INSTRUCTIONS_MAX_LENGTH} characters.`,
                },
            },
        },
        PRICE_PER_PERSON: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_PRICE_PER_PERSON",
                MESSAGE: "Experience price per person is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_PRICE_PER_PERSON_TYPE",
                MESSAGE: "Experience price per person must be a number.",
            },
            POSITIVE: {
                CODE: "INVALID_EXPERIENCE_PRICE_PER_PERSON_POSITIVE",
                MESSAGE: "Experience price per person must be positive.",
            },
            INTEGER: {
                CODE: "INVALID_EXPERIENCE_PRICE_PER_PERSON_INTEGER",
                MESSAGE: "Experience price per person must be an integer.",
            },
        },
        GROUP_DISCOUNTS: {
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GROUP_DISCOUNTS_TYPE",
                MESSAGE: "Experience group discounts must be an object.",
            },
            AT_LEAST_ONE_REQUIRED: {
                CODE: "MISSING_GROUP_DISCOUNT_PERCENTAGE",
                MESSAGE:
                    "At least one group discount percentage (for 3+ or 5+ people) is required.",
            },
        },
        GROUP_DISCOUNT_PERCENTAGE_FOR_3_PLUS: {
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GROUP_DISCOUNT_PERCENTAGE_FOR_3_PLUS_TYPE",
                MESSAGE:
                    "Experience group discount percentage for 3+ must be a number.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_GROUP_DISCOUNT_PERCENTAGE_FOR_3_PLUS_VALUE",
                MESSAGE: `Experience group discount percentage for 3+ must be one of the following: ${EXPERIENCE_GROUP_DISCOUNT_PERCENTAGES_FOR_3_PLUS.map(
                    (percentage) => percentage
                ).join(", ")}`,
            },
        },
        GROUP_DISCOUNT_PERCENTAGE_FOR_5_PLUS: {
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GROUP_DISCOUNT_PERCENTAGE_FOR_5_PLUS_TYPE",
                MESSAGE:
                    "Experience group discount percentage for 5+ must be a number.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_GROUP_DISCOUNT_PERCENTAGE_FOR_5_PLUS_VALUE",
                MESSAGE: `Experience group discount percentage for 5+ must be one of the following: ${EXPERIENCE_GROUP_DISCOUNT_PERCENTAGES_FOR_5_PLUS.map(
                    (percentage) => percentage
                ).join(", ")}`,
            },
        },
        EARLY_BIRD_RATE: {
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_EARLY_BIRD_RATE_TYPE",
                MESSAGE: "Experience early bird rate must be an object.",
            },
        },
        EARLY_BIRD_RATE_DISCOUNT_PERCENTAGE: {
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_EARLY_BIRD_RATE_DISCOUNT_PERCENTAGE_TYPE",
                MESSAGE:
                    "Experience early bird rate discount percentage must be a number.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_EARLY_BIRD_RATE_DISCOUNT_PERCENTAGE_VALUE",
                MESSAGE: `Experience early bird rate discount percentage must be one of the following: ${EXPERIENCE_EARLY_BIRD_RATE_DISCOUNT_PERCENTAGES.map(
                    (percentage) => percentage
                ).join(", ")}`,
            },
        },
        DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE: {
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE_TYPE",
                MESSAGE:
                    "Days before deadline for early bird rate must be a number.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE_VALUE",
                MESSAGE: `Days before deadline for early bird rate must be one of the following: ${EXPERIENCE_DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE.map(
                    (days) => days
                ).join(", ")}`,
            },
        },
        CANCELLATION_POLICY: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_CANCELLATION_POLICY",
                MESSAGE: "Experience cancellation policy is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_CANCELLATION_POLICY_TYPE",
                MESSAGE: "Experience cancellation policy must be a string.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_CANCELLATION_POLICY_VALUE",
                MESSAGE: `Invalid cancellation policy. Must be one of the following: ${EXPERIENCE_CANCELLATION_POLICY.map(
                    (policy) => policy
                ).join(", ")}`,
            },
        },
        GROUP_SIZE: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_GROUP_SIZE",
                MESSAGE: "Experience group size is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GROUP_SIZE_TYPE",
                MESSAGE: "Experience group size must be an object.",
            },
        },
        GROUP_SIZE_MIN_GUESTS: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_GROUP_SIZE_MIN_GUESTS",
                MESSAGE: "Minimum guests is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GROUP_SIZE_MIN_GUESTS_TYPE",
                MESSAGE: "Minimum guests must be a number.",
            },
            MIN_VALUE: {
                CODE: "INVALID_EXPERIENCE_GROUP_SIZE_MIN_GUESTS",
                MESSAGE: `Minimum guests must be greater than ${EXPERIENCE_GROUP_SIZE_MIN}.`,
            },
        },
        GROUP_SIZE_MAX_GUESTS: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_GROUP_SIZE_MAX_GUESTS",
                MESSAGE: "Maximum guests is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GROUP_SIZE_MAX_GUESTS_TYPE",
                MESSAGE: "Maximum guests must be a number.",
            },
            MAX_VALUE: {
                CODE: "INVALID_EXPERIENCE_GROUP_SIZE_MAX_GUESTS",
                MESSAGE: `Maximum guests must be less than ${EXPERIENCE_GROUP_SIZE_MAX}.`,
            },
        },
        GROUP_SIZE_AUTO_CANCEL_ENABLED: {
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GROUP_SIZE_AUTO_CANCEL_ENABLED_TYPE",
                MESSAGE: "Auto cancel enabled must be a boolean.",
            },
        },
        IMAGES: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_IMAGES",
                MESSAGE: "Experience images are required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_IMAGES_TYPE",
                MESSAGE: "Experience images must be an array.",
            },
            INVALID: {
                CODE: "INVALID_EXPERIENCE_IMAGES",
                MESSAGE: "Invalid cover image URL.",
            },
            MIN_COUNT: {
                CODE: "INVALID_EXPERIENCE_IMAGES_MIN_COUNT",
                MESSAGE: `At least ${EXPERIENCE_IMAGES_MIN_COUNT} image is required.`,
            },
            MAX_COUNT: {
                CODE: "INVALID_EXPERIENCE_IMAGES_MAX_COUNT",
                MESSAGE: `At most ${EXPERIENCE_IMAGES_MAX_COUNT} images are allowed.`,
            },
        },
        IMAGE_TYPE: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_IMAGE_TYPE",
                MESSAGE: "Image type is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_IMAGE_TYPE",
                MESSAGE: `Image type must be one of the following: ${EXPERIENCE_IMAGE_TYPES.map(
                    (type) => type
                ).join(", ")}`,
            },
        },
        COVER_IMAGE_URL: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_COVER_IMAGE_URL",
                MESSAGE: "Cover image URL is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_COVER_IMAGE_URL_TYPE",
                MESSAGE: "Cover image URL must be a string.",
            },
            INVALID: {
                CODE: "INVALID_EXPERIENCE_COVER_IMAGE_URL",
                MESSAGE: "Invalid cover image URL.",
            },
        },
        GALLERY_IMAGE_URL: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_GALLERY_IMAGE_URL",
                MESSAGE: "Gallery image URL is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GALLERY_IMAGE_URL_TYPE",
                MESSAGE: "Gallery image URL must be a string.",
            },
            INVALID: {
                CODE: "INVALID_EXPERIENCE_GALLERY_IMAGE_URL",
                MESSAGE: "Invalid gallery image URL.",
            },
        },
        GALLERY_IMAGE_URLS: {
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GALLERY_IMAGE_URLS_TYPE",
                MESSAGE: "Gallery image URLs must be an array.",
            },
        },
        INCLUDED_ITEMS: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_INCLUDED_ITEMS",
                MESSAGE: "Included items are required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_INCLUDED_ITEMS_TYPE",
                MESSAGE: "Included items must be an array.",
            },
            ICON_NAME_MISSING: {
                CODE: "MISSING_INCLUDED_ITEM_ICON_NAME",
                MESSAGE: "Icon name is required for included item.",
            },
            ICON_NAME_INVALID_TYPE: {
                CODE: "INVALID_INCLUDED_ITEM_ICON_NAME_TYPE",
                MESSAGE: "Icon name must be a string.",
            },
            ICON_TYPE_MISSING: {
                CODE: "MISSING_INCLUDED_ITEM_ICON_TYPE",
                MESSAGE: "Icon type is required for included item.",
            },
            ICON_TYPE_INVALID_TYPE: {
                CODE: "INVALID_INCLUDED_ITEM_ICON_TYPE",
                MESSAGE: "Icon type must be one of: material, ionicons, fontawesome5.",
            },
            TEXT_MISSING: {
                CODE: "MISSING_INCLUDED_ITEM_TEXT",
                MESSAGE: "Text is required for included item.",
            },
            TEXT_INVALID_TYPE: {
                CODE: "INVALID_INCLUDED_ITEM_TEXT_TYPE",
                MESSAGE: "Text must be a string.",
            },
        },
        GUEST_REQUIREMENTS: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_GUEST_REQUIREMENTS",
                MESSAGE: "Guest requirements are required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_GUEST_REQUIREMENTS_TYPE",
                MESSAGE: "Guest requirements must be an array.",
            },
            ICON_NAME_MISSING: {
                CODE: "MISSING_GUEST_REQUIREMENT_ICON_NAME",
                MESSAGE: "Icon name is required for guest requirement.",
            },
            ICON_NAME_INVALID_TYPE: {
                CODE: "INVALID_GUEST_REQUIREMENT_ICON_NAME_TYPE",
                MESSAGE: "Icon name must be a string.",
            },
            ICON_TYPE_MISSING: {
                CODE: "MISSING_GUEST_REQUIREMENT_ICON_TYPE",
                MESSAGE: "Icon type is required for guest requirement.",
            },
            ICON_TYPE_INVALID_TYPE: {
                CODE: "INVALID_GUEST_REQUIREMENT_ICON_TYPE",
                MESSAGE: "Icon type must be one of: material, ionicons, fontawesome5.",
            },
            TEXT_MISSING: {
                CODE: "MISSING_GUEST_REQUIREMENT_TEXT",
                MESSAGE: "Text is required for guest requirement.",
            },
            TEXT_INVALID_TYPE: {
                CODE: "INVALID_GUEST_REQUIREMENT_TEXT_TYPE",
                MESSAGE: "Text must be a string.",
            },
        },
        AGE_RECOMMENDATIONS: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_AGE_RECOMMENDATIONS",
                MESSAGE: "Age recommendations are required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_AGE_RECOMMENDATIONS_TYPE",
                MESSAGE: "Age recommendations must be an string.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_AGE_RECOMMENDATIONS_VALUE",
                MESSAGE: `Invalid age recommendations. Must be one of the following: ${EXPERIENCE_AGE_RECOMMENDATIONS.map(
                    (age) => age
                ).join(", ")}`,
            },
        },
        DURATION_HOURS: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_DURATION_HOURS",
                MESSAGE: "Duration hours are required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_DURATION_HOURS_TYPE",
                MESSAGE: "Duration hours must be a number.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_DURATION_HOURS_VALUE",
                MESSAGE: `Invalid duration hours. Must be one of the following: ${EXPERIENCE_DURATION_HOURS.map(
                    (hour) => hour
                ).join(", ")}`,
            },
        },
        TIMEZONE: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_TIMEZONE",
                MESSAGE: "Timezone is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_TIMEZONE_TYPE",
                MESSAGE: "Timezone must be a string.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_TIMEZONE_VALUE",
                MESSAGE: `Invalid timezone. Must be one of the following: ${IANA_TIMEZONES.map(
                    (timezone) => timezone
                ).join(", ")}`,
            },
        },
        AVAILABILITY: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_AVAILABILITY",
                MESSAGE: "Availability is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_TYPE",
                MESSAGE: "Availability must be an object.",
            },
        },
        AVAILABILITY_START_DATE: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_AVAILABILITY_START_DATE",
                MESSAGE: "Start date is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_START_DATE_TYPE",
                MESSAGE: "Start date must be a string.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_START_DATE_VALUE",
                MESSAGE: "Invalid start date.",
            },
        },
        AVAILABILITY_END_DATE: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_AVAILABILITY_END_DATE",
                MESSAGE: "End date is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_END_DATE_TYPE",
                MESSAGE: "End date must be a string.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_END_DATE_VALUE",
                MESSAGE: "Invalid end date.",
            },
        },
        AVAILABILITY_DAYS_OF_WEEK: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_AVAILABILITY_DAYS_OF_WEEK",
                MESSAGE: "Days of week are required.",
            },
            MIN_LENGTH: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_DAYS_OF_WEEK_MIN_LENGTH",
                MESSAGE: `Days of week must be contain at least 1 day.`,
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_RECURRING_DAYS_OF_WEEK_TYPE",
                MESSAGE: "Days of week must be an array.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_RECURRING_DAYS_OF_WEEK_VALUE",
                MESSAGE: `Invalid days of week. Must be one of the following: ${[
                    0, 1, 2, 3, 4, 5, 6,
                ]
                    .map((day) => day)
                    .join(", ")}`,
            },
            DUPLICATE_VALUES: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_RECURRING_DAYS_OF_WEEK_DUPLICATE_VALUES",
                MESSAGE: "Days of week must not contain duplicate values.",
            },
        },
        AVAILABILITY_SPECIFIC_DAY: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_AVAILABILITY_SPECIFIC_DAY",
                MESSAGE: "Specific day is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_SPECIFIC_DAY_TYPE",
                MESSAGE: "Specific day must be a number.",
            },
            MIN_VALUE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_SPECIFIC_DAY_MIN_VALUE",
                MESSAGE: `Specific day must be greater than 0.`,
            },
            MAX_VALUE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_DAYS_OF_WEEK_MAX_VALUE",
                MESSAGE: `Specific day must be less than 6.`,
            },
        },
        AVAILABILITY_TIME_SLOTS: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_AVAILABILITY_TIME_SLOTS",
                MESSAGE: "Time slots are required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_TIME_SLOTS_TYPE",
                MESSAGE: "Time slots must be an array.",
            },
            MIN_LENGTH: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_TIME_SLOTS_MIN_LENGTH",
                MESSAGE: `Time slots must contain at least 1 time slot.`,
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_TIME_SLOTS_VALUE",
                MESSAGE: `Invalid time slots. Must be in the format of HH:MM.`,
            },
        },
        AVAILABILITY_SPECIFIC_TIME: {
            MISSING: {
                CODE: "MISSING_EXPERIENCE_AVAILABILITY_SPECIFIC_TIME",
                MESSAGE: "Specific time is required.",
            },
            INVALID_TYPE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_SPECIFIC_TIME_TYPE",
                MESSAGE: "Specific time must be a string.",
            },
            INVALID_VALUE: {
                CODE: "INVALID_EXPERIENCE_AVAILABILITY_SPECIFIC_TIME_VALUE",
                MESSAGE: `Invalid specific time. Must be in the format of HH:MM.`,
            },
        },
        FORBIDDEN_DELETE: {
            CODE: "EXPERIENCE_FORBIDDEN_DELETE",
            MESSAGE: "You do not have permission to delete this experience.",
        },
        FORBIDDEN_UPDATE: {
            CODE: "EXPERIENCE_FORBIDDEN_UPDATE",
            MESSAGE: "You do not have permission to update this experience.",
        },
    },
};
