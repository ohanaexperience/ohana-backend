export type ExperienceCategory = {
    main: "food" | "drink" | "activity" | "tour";
    sub: "food" | "drink" | "activity" | "tour";
};
export type ExperienceGroupSize = {
    minGuests: number;
    maxGuests: number;
    autoCancelEnabled: boolean;
    autoCancelHours: number;
};
export type ExperienceAgeRecommendation = {
    range: "18-25" | "26-35" | "36-45" | "46-55" | "56-65" | "66+";
    accessibilityInfo: string;
};
export type ExperienceGroupDiscount = {
    enabled: boolean;
    discountPercentageFor3Plus: 5 | 10 | 15 | 20 | 25 | null;
    discountPercentageFor5Plus: 10 | 15 | 20 | 25 | 30 | null;
};
export type TimeSlot = {
    startTime: Date;
    endTime: Date;
};
export type ExperienceAvailability = {
    isRecurring: boolean;

    // For recurring experiences
    recurring?: {
        daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
        timeSlots: TimeSlot[]; // Times offered on recurring days
        startDate: string; // ISO date when recurring pattern begins
        endDate: string; // ISO date when recurring pattern ends
        endCondition?: string; // Additional end condition (e.g., "after 10 bookings")
    };

    // For one-time experiences
    oneTime?: {
        date: string; // ISO date of the experience
        timeSlots: TimeSlot[]; // Available time slots on this date
    };
};
export type ExperienceEarlyBirdRate = {
    enabled: boolean;
    discountPercentage: 5 | 10 | 15 | 20 | 25 | null;
    daysInAdvance: number | null;
};
export type ExperienceMeetingLocation = {
    instructions: string;
    imageUrl: string;
};
