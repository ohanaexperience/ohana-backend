/**
 * Test Data Generator
 * Generates realistic test data for e2e tests
 */

export class TestDataGenerator {
    private static counter = 0;

    static getUniqueId(): string {
        return `${Date.now()}-${++this.counter}`;
    }

    static generateTestUser() {
        const uniqueId = this.getUniqueId();
        return {
            email: `test-user-${uniqueId}@example.com`,
            password: 'TempPassword123!',
            firstName: 'Test',
            lastName: `User${uniqueId}`,
            phoneNumber: `+1555${uniqueId.slice(-7).padStart(7, '0')}`,
        };
    }

    static generateTestExperience() {
        const uniqueId = this.getUniqueId();
        return {
            title: `Test Adventure Experience ${uniqueId}`,
            tagline: `An amazing test experience created at ${new Date().toISOString()}`,
            category: {
                mainId: 1, // Adventure category
                subId: 1,  // Outdoor Adventure subcategory
            },
            languages: ['en'],
            experienceType: 'adventure' as const,
            description: `This is a comprehensive test experience created for e2e testing. It includes all required fields and should be fully functional. Created at ${new Date().toISOString()}.`,
            startingLocation: {
                address: '123 Adventure Start Street, Test City, TC 12345',
                latitude: 40.7128 + (Math.random() - 0.5) * 0.01, // Near NYC with small random offset
                longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
            },
            endingLocation: {
                address: '456 Adventure End Avenue, Test City, TC 12345',
                latitude: 40.7589 + (Math.random() - 0.5) * 0.01,
                longitude: -73.9851 + (Math.random() - 0.5) * 0.01,
            },
            meetingLocation: {
                instructions: 'Meet at the main entrance near the big oak tree. Look for the guide with a red hat.',
            },
            pricePerPerson: 75 + Math.floor(Math.random() * 50), // $75-$125
            cancellationPolicy: 'flexible' as const,
            groupSize: {
                minGuests: 1,
                maxGuests: 8,
                autoCancelEnabled: false,
            },
            includedItems: [
                'Professional guide',
                'Safety equipment',
                'Light refreshments',
                'Photo opportunities',
            ],
            physicalRequirements: 'moderate' as const,
            ageRecommendations: 'adults-only' as const,
            durationHours: 3,
            timezone: 'America/New_York',
            availability: {
                startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
                timeSlots: ['10:00', '14:00'],
            },
            images: [], // Will be populated if testing image uploads
        };
    }

    static generateTestHost() {
        const uniqueId = this.getUniqueId();
        return {
            businessName: `Test Adventure Company ${uniqueId}`,
            businessDescription: `A professional adventure company created for testing purposes. Established ${new Date().getFullYear()}.`,
            businessAddress: `789 Business Lane, Test City, TC 12345`,
            businessPhone: `+1555${uniqueId.slice(-7).padStart(7, '0')}`,
            businessEmail: `business-${uniqueId}@testcompany.com`,
            hostingExperience: 'expert' as const,
            specialties: ['adventure', 'outdoor'],
            languages: ['en', 'es'],
            responseTime: 'within-hour' as const,
            bio: `Experienced adventure guide with over 10 years of experience. Passionate about sharing the outdoors with others. Test host created on ${new Date().toISOString()}.`,
        };
    }

    static generateMinimalExperience() {
        const uniqueId = this.getUniqueId();
        return {
            title: `Minimal Test Experience ${uniqueId}`,
            tagline: 'A minimal test experience with only required fields',
            category: {
                mainId: 1,
                subId: 1,
            },
            languages: ['en'],
            experienceType: 'cultural' as const,
            description: 'Minimal test experience description.',
            startingLocation: {
                address: '123 Start St, Test City',
                latitude: 40.7128,
                longitude: -74.0060,
            },
            endingLocation: {
                address: '456 End Ave, Test City',
                latitude: 40.7589,
                longitude: -73.9851,
            },
            meetingLocation: {
                instructions: 'Meet at entrance',
            },
            pricePerPerson: 50,
            cancellationPolicy: 'flexible' as const,
            groupSize: {
                minGuests: 1,
                maxGuests: 4,
                autoCancelEnabled: false,
            },
            includedItems: ['guide'],
            physicalRequirements: 'easy' as const,
            ageRecommendations: 'all-ages' as const,
            durationHours: 2,
            timezone: 'America/New_York',
            availability: {
                startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                timeSlots: ['10:00'],
            },
            images: [],
        };
    }

    static generateInvalidExperience() {
        return {
            title: '', // Invalid: empty title
            tagline: 'Invalid experience',
            category: {
                mainId: 999, // Invalid: non-existent category
                subId: 999,
            },
            languages: [],
            experienceType: 'invalid' as any,
            // Missing required fields
        };
    }
}