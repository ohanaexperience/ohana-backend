export const EXPERIENCE_STATUS = ["draft", "published", "archived"] as const;
export const EXPERIENCE_TYPE = ["indoor", "outdoor", "both"] as const;
export const EXPERIENCE_INCLUDED_ITEMS = [
    "food",
    "drinks",
    "transport",
    "equipment",
] as const;
export const EXPERIENCE_PHYSICAL_REQUIREMENTS = [
    "low",
    "medium",
    "high",
] as const;
export const EXPERIENCE_DURATION = [
    "1-2 hours",
    "2-3 hours",
    "3-4 hours",
    "4-5 hours",
    "5-6 hours",
] as const;
export const EXPERIENCE_CANCELLATION_POLICY = [
    "strict",
    "moderate",
    "flexible",
] as const;
export const EXPERIENCE_TITLE_MIN_LENGTH = 15;
export const EXPERIENCE_TITLE_MAX_LENGTH = 80;
export const EXPERIENCE_TAGLINE_MIN_LENGTH = 10;
export const EXPERIENCE_TAGLINE_MAX_LENGTH = 100;
