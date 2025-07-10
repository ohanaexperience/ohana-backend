// Review rating constraints
export const MIN_RATING = 1;
export const MAX_RATING = 5;

// Review text constraints
export const MIN_TITLE_LENGTH = 5;
export const MAX_TITLE_LENGTH = 100;
export const MIN_COMMENT_LENGTH = 10;
export const MAX_COMMENT_LENGTH = 1000;

// Host response constraints
export const MAX_HOST_RESPONSE_LENGTH = 1000;

// Review status values
export const REVIEW_STATUS = ["active", "flagged", "removed"] as const;

// Review flagging reasons
export const REVIEW_FLAG_REASONS = [
    "inappropriate_language",
    "spam",
    "fake_review",
    "personal_information",
    "irrelevant_content",
    "discrimination",
    "other",
] as const;

// Review category labels
export const REVIEW_CATEGORIES = {
    valueForMoney: "Value for Money",
    communication: "Communication",
    accuracy: "Accuracy",
    location: "Location",
    checkin: "Check-in",
    cleanliness: "Cleanliness",
} as const;

// Minimum time after experience completion before review can be submitted (hours)
export const MIN_HOURS_AFTER_EXPERIENCE = 2;

// Maximum time after experience completion before review expires (days)
export const MAX_DAYS_AFTER_EXPERIENCE = 30;