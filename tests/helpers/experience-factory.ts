import { CreateExperienceRequest } from "@/experiences/validations";

export interface ExperienceTestData extends Omit<CreateExperienceRequest, 'authorization'> {}

export class ExperienceFactory {
    static createValidExperienceData(overrides: Partial<ExperienceTestData> = {}): ExperienceTestData {
        const timestamp = Date.now();
        
        return {
            title: `Test Adventure Experience ${timestamp}`,
            tagline: "An amazing test adventure",
            category: {
                mainId: 1, // Adventure category
                subId: 1,  // Outdoor adventure subcategory
            },
            languages: ["en", "es"],
            type: "adventure",
            description: "This is a comprehensive test experience that covers all the amazing aspects of adventure tourism. Perfect for testing the complete flow.",
            startingLocation: {
                address: "123 Start Street, Test City, NY 10001",
                latitude: 40.7128,
                longitude: -74.0060,
            },
            endingLocation: {
                address: "456 End Avenue, Test City, NY 10002",
                latitude: 40.7589,
                longitude: -73.9851,
            },
            meetingLocation: {
                instructions: "Meet at the main entrance next to the information desk",
            },
            pricePerPerson: 75,
            groupDiscounts: {
                discountPercentageFor3Plus: 10,
                discountPercentageFor5Plus: 15,
            },
            earlyBirdRate: {
                discountPercentage: 20,
                daysInAdvance: 7,
            },
            cancellationPolicy: "flexible",
            groupSize: {
                minGuests: 2,
                maxGuests: 8,
                autoCancelEnabled: true,
            },
            includedItems: ["equipment", "snacks", "guide"],
            whatToBring: "Comfortable shoes, water bottle, and weather-appropriate clothing",
            physicalRequirements: "Moderate physical fitness required. Ability to walk on uneven terrain for extended periods.",
            ageRecommendations: "adult-only",
            durationHours: 4,
            timezone: "America/New_York",
            availability: {
                startDate: "2024-02-01",
                endDate: "2024-12-31",
                daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
                timeSlots: ["09:00", "14:00"],
            },
            images: [
                {
                    imageType: "cover",
                    mimeType: "image/jpeg",
                },
                {
                    imageType: "gallery",
                    mimeType: "image/jpeg",
                },
                {
                    imageType: "gallery",
                    mimeType: "image/png",
                },
            ],
            ...overrides,
        };
    }

    static createMinimalExperienceData(overrides: Partial<ExperienceTestData> = {}): ExperienceTestData {
        const timestamp = Date.now();
        
        return {
            title: `Minimal Test Experience ${timestamp}`,
            tagline: "Simple test experience",
            category: {
                mainId: 1,
                subId: 1,
            },
            languages: ["en"],
            type: "cultural",
            description: "A minimal experience for testing basic functionality",
            startingLocation: {
                address: "Start Point",
                latitude: 40.7128,
                longitude: -74.0060,
            },
            endingLocation: {
                address: "End Point",
                latitude: 40.7589,
                longitude: -73.9851,
            },
            meetingLocation: {
                instructions: "Meet at the entrance",
            },
            pricePerPerson: 25,
            cancellationPolicy: "moderate",
            groupSize: {
                minGuests: 1,
                maxGuests: 2,
                autoCancelEnabled: false,
            },
            includedItems: [],
            physicalRequirements: "No specific physical requirements",
            ageRecommendations: "all-ages",
            durationHours: 1,
            timezone: "America/New_York",
            availability: {
                startDate: "2024-03-01",
                timeSlots: ["12:00"],
            },
            images: [],
            ...overrides,
        };
    }

    static createFoodExperienceData(overrides: Partial<ExperienceTestData> = {}): ExperienceTestData {
        const timestamp = Date.now();
        
        return {
            title: `Culinary Test Experience ${timestamp}`,
            tagline: "Delicious food adventure",
            category: {
                mainId: 2, // Food & Drink category
                subId: 3,  // Cooking class subcategory
            },
            languages: ["en", "fr"],
            type: "culinary",
            description: "Learn to cook authentic dishes in this hands-on culinary experience",
            startingLocation: {
                address: "Cooking Studio, 789 Chef Street",
                latitude: 40.7505,
                longitude: -73.9934,
            },
            endingLocation: {
                address: "Cooking Studio, 789 Chef Street",
                latitude: 40.7505,
                longitude: -73.9934,
            },
            meetingLocation: {
                instructions: "Enter through the main kitchen entrance",
            },
            pricePerPerson: 95,
            earlyBirdRate: {
                discountPercentage: 15,
                daysInAdvance: 5,
            },
            cancellationPolicy: "strict",
            groupSize: {
                minGuests: 4,
                maxGuests: 12,
                autoCancelEnabled: false,
            },
            includedItems: ["ingredients", "equipment", "recipes", "meal"],
            whatToBring: "Apron (optional - we provide one)",
            physicalRequirements: "Ability to stand for extended periods",
            ageRecommendations: "teen-and-up",
            durationHours: 3,
            timezone: "America/New_York",
            availability: {
                startDate: "2024-04-01",
                endDate: "2024-11-30",
                daysOfWeek: [6, 7], // Weekends only
                timeSlots: ["11:00", "15:00"],
            },
            images: [
                {
                    imageType: "cover",
                    mimeType: "image/jpeg",
                },
            ],
            ...overrides,
        };
    }

    static createInvalidCategoryExperienceData(overrides: Partial<ExperienceTestData> = {}): ExperienceTestData {
        return {
            ...this.createMinimalExperienceData(),
            title: "Invalid Category Experience",
            category: {
                mainId: 999, // Non-existent category
                subId: 999,  // Non-existent subcategory
            },
            ...overrides,
        };
    }

    static createExperienceWithValidationErrors(overrides: Partial<ExperienceTestData> = {}): Partial<ExperienceTestData> {
        return {
            title: "", // Empty title should fail validation
            tagline: "Invalid experience",
            category: {
                mainId: 1,
                subId: 1,
            },
            languages: [],
            type: "adventure",
            description: "Too short", // Description too short
            startingLocation: {
                address: "",
                latitude: 200, // Invalid latitude
                longitude: -74.0060,
            },
            endingLocation: {
                address: "End Point",
                latitude: 40.7589,
                longitude: -200, // Invalid longitude
            },
            meetingLocation: {
                instructions: "",
            },
            pricePerPerson: -10, // Negative price
            cancellationPolicy: "flexible",
            groupSize: {
                minGuests: 0, // Invalid min guests
                maxGuests: -1, // Invalid max guests
                autoCancelEnabled: false,
            },
            includedItems: [],
            physicalRequirements: "Invalid requirements test",
            ageRecommendations: "all-ages",
            durationHours: 0, // Invalid duration
            timezone: "Invalid/Timezone",
            availability: {
                startDate: "invalid-date",
                timeSlots: [],
            },
            images: [],
            ...overrides,
        };
    }

    static createRequestWithAuth(experienceData: ExperienceTestData, token: string = "Bearer mock-token"): CreateExperienceRequest {
        return {
            authorization: token,
            ...experienceData,
        };
    }
}

// Export some commonly used test data
export const VALID_EXPERIENCE_DATA = ExperienceFactory.createValidExperienceData();
export const MINIMAL_EXPERIENCE_DATA = ExperienceFactory.createMinimalExperienceData();
export const FOOD_EXPERIENCE_DATA = ExperienceFactory.createFoodExperienceData();
export const INVALID_CATEGORY_EXPERIENCE_DATA = ExperienceFactory.createInvalidCategoryExperienceData();