// Experience Title
export const EXPERIENCE_TITLE_MIN_LENGTH = 15;
export const EXPERIENCE_TITLE_MAX_LENGTH = 80;

// Experience Tagline
export const EXPERIENCE_TAGLINE_MIN_LENGTH = 10;
export const EXPERIENCE_TAGLINE_MAX_LENGTH = 100;

// Experience Type
export const EXPERIENCE_TYPE = ["indoor", "outdoor", "both"];

// Experience Description
export const EXPERIENCE_DESCRIPTION_MIN_LENGTH = 10;
export const EXPERIENCE_DESCRIPTION_MAX_LENGTH = 1000;

// Experience Location
export const EXPERIENCE_STARTING_LOCATION_ADDRESS_MIN_LENGTH = 10;
export const EXPERIENCE_STARTING_LOCATION_ADDRESS_MAX_LENGTH = 500;
export const EXPERIENCE_ENDING_LOCATION_ADDRESS_MIN_LENGTH = 10;
export const EXPERIENCE_ENDING_LOCATION_ADDRESS_MAX_LENGTH = 500;

// Experience Meeting
export const EXPERIENCE_MEETING_INSTRUCTIONS_MIN_LENGTH = 10;
export const EXPERIENCE_MEETING_INSTRUCTIONS_MAX_LENGTH = 1000;

// Experience Group Discounts
export const EXPERIENCE_GROUP_DISCOUNT_PERCENTAGES_FOR_3_PLUS = [
    5, 10, 15, 20, 25,
];
export const EXPERIENCE_GROUP_DISCOUNT_PERCENTAGES_FOR_5_PLUS = [
    10, 15, 20, 25, 30,
];

// Early Bird Rate
export const EXPERIENCE_EARLY_BIRD_RATE_DISCOUNT_PERCENTAGES = [
    5, 10, 15, 20, 25,
];
export const EXPERIENCE_DAYS_BEFORE_DEADLINE_FOR_EARLY_BIRD_RATE = [
    14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
];

// Cancellation Policy
export const EXPERIENCE_CANCELLATION_POLICY = [
    "strict",
    "moderate",
    "flexible",
];

// Group Size
export const EXPERIENCE_GROUP_SIZE_MIN = 1;
export const EXPERIENCE_GROUP_SIZE_MAX = 30;
export const EXPERIENCE_GROUP_SIZE_AUTO_CANCEL_HOURS = 24;

// Included Items
export const EXPERIENCE_INCLUDED_ITEMS = [
    "food",
    "drinks",
    "transport",
    "equipment",
];

// What To Bring
export const EXPERIENCE_WHAT_TO_BRING_MIN_LENGTH = 10;
export const EXPERIENCE_WHAT_TO_BRING_MAX_LENGTH = 1000;

// Physical Requirements
export const EXPERIENCE_PHYSICAL_REQUIREMENTS = ["low", "medium", "high"];

// Age Recommendations
export const EXPERIENCE_AGE_RECOMMENDATIONS = [
    "18-25",
    "26-35",
    "36-45",
    "46-55",
    "56-65",
    "66+",
];

// Accessibility Info
export const EXPERIENCE_ACCESSIBILITY_INFO_MIN_LENGTH = 10;
export const EXPERIENCE_ACCESSIBILITY_INFO_MAX_LENGTH = 1000;

// Experience Duration
export const EXPERIENCE_DURATION_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Experience Status
export const EXPERIENCE_STATUS = ["draft", "published", "archived"];

// Experience Gallery Images
export const EXPERIENCE_GALLERY_IMAGE_MIN_COUNT = 1;
export const EXPERIENCE_GALLERY_IMAGE_MAX_COUNT = 6;

// Experience Images
export const EXPERIENCE_IMAGES_MIN_COUNT = 1;
export const EXPERIENCE_IMAGES_MAX_COUNT =
    EXPERIENCE_GALLERY_IMAGE_MAX_COUNT + 1;

// Experience Image Types
export const EXPERIENCE_IMAGE_TYPES = ["cover", "gallery", "meeting-location"];
