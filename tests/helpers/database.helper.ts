import { DatabaseFactory } from "@/database";
import { createDatabaseConfig, createDirectConfig } from "@/database/proxy-config";
import { DatabaseService } from "@/database/services/database";

export interface TestDatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
}

export class DatabaseTestHelper {
    private db: any;
    private databaseService: DatabaseService;

    constructor(config?: Partial<TestDatabaseConfig>) {
        if (config) {
            // Use custom config for tests
            const defaultConfig: TestDatabaseConfig = {
                host: process.env.DB_ENDPOINT || "localhost",
                port: parseInt(process.env.DB_PORT || "5432"),
                database: process.env.DB_NAME || "test_db",
                user: process.env.DB_USER || "postgres",
                password: process.env.DB_PASSWORD || "password",
                ssl: false,
            };

            const finalConfig = { ...defaultConfig, ...config };

            this.db = DatabaseFactory.create({
                postgres: finalConfig,
            });
        } else {
            // Use the standard database configuration (supports both direct and proxy)
            const dbConfig = createDatabaseConfig();
            this.db = DatabaseFactory.create({ postgres: dbConfig });
        }

        this.databaseService = new DatabaseService({
            database: this.db,
        });
    }

    async setupDatabase(): Promise<void> {
        await this.databaseService.clearDatabase();
        await this.databaseService.runMigrations();
        await this.databaseService.seedDatabase();
    }

    async teardownDatabase(): Promise<void> {
        await this.databaseService.clearDatabase();
    }

    getDatabase() {
        return this.db;
    }

    async createTestUser(overrides: Partial<any> = {}): Promise<any> {
        const defaultUser = {
            id: `test-user-${Date.now()}`,
            email: `test-${Date.now()}@example.com`,
            firstName: "Test",
            lastName: "User",
            phoneNumber: "+1234567890",
            ...overrides,
        };

        return await this.db.users.create(defaultUser);
    }

    async createTestHost(userId: string, overrides: Partial<any> = {}): Promise<any> {
        const defaultHost = {
            id: `test-host-${Date.now()}`,
            userId,
            businessName: "Test Business",
            businessDescription: "Test business description",
            businessAddress: "123 Test Street, Test City",
            businessPhone: "+1234567890",
            businessEmail: `business-${Date.now()}@test.com`,
            hostingExperience: "expert",
            specialties: ["adventure", "cultural"],
            languages: ["en", "es"],
            responseTime: "within-hour",
            avgRating: 0,
            totalReviews: 0,
            status: "active",
            ...overrides,
        };

        return await this.db.hosts.create(defaultHost);
    }

    async createTestUserAndHost(userOverrides: Partial<any> = {}, hostOverrides: Partial<any> = {}): Promise<{ user: any; host: any }> {
        const user = await this.createTestUser(userOverrides);
        const host = await this.createTestHost(user.id, hostOverrides);
        return { user, host };
    }

    async createTestHostVerification(userId: string, overrides: Partial<any> = {}): Promise<any> {
        const defaultVerification = {
            id: `test-hv-${Date.now()}`,
            userId,
            status: "verified",
            submittedAt: new Date(),
            verifiedAt: new Date(),
            verifiedBy: "test-admin",
            ...overrides,
        };

        return await this.db.hostVerifications.create(defaultVerification);
    }

    async createTestExperience(hostId: string, overrides: Partial<any> = {}): Promise<any> {
        const defaultExperience = {
            hostId,
            title: "Test Experience",
            tagline: "A test experience",
            categoryId: 1, // Assuming category 1 exists from seeding
            subCategoryId: 1,
            languages: ["en"],
            type: "adventure",
            description: "This is a test experience description",
            startingLocationAddress: "123 Start Street",
            startingLocation: [-74.0060, 40.7128], // [longitude, latitude]
            endingLocationAddress: "456 End Street",
            endingLocation: [-73.9851, 40.7589],
            meetingLocation: {
                instructions: "Meet at the main entrance",
            },
            pricePerPerson: 50,
            cancellationPolicy: "flexible",
            minGuests: 1,
            maxGuests: 4,
            autoCancelEnabled: false,
            includedItems: ["equipment"],
            physicalRequirements: "Moderate physical fitness required",
            ageRange: "all-ages",
            durationHours: 2,
            timezone: "America/New_York",
            status: "published",
            isPublic: true,
            ...overrides,
        };

        return await this.db.experiences.create(defaultExperience);
    }

    async cleanupTestData(): Promise<void> {
        // Clean up test data in reverse dependency order
        await this.db.query("DELETE FROM experience_time_slots WHERE experience_id IN (SELECT id FROM experiences WHERE title LIKE 'Test%')");
        await this.db.query("DELETE FROM experience_availability WHERE experience_id IN (SELECT id FROM experiences WHERE title LIKE 'Test%')");
        await this.db.query("DELETE FROM experiences WHERE title LIKE 'Test%'");
        await this.db.query("DELETE FROM hosts WHERE business_name LIKE 'Test%'");
        await this.db.query("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example.com'");
    }
}

export const createTestDatabase = (config?: Partial<TestDatabaseConfig>) => {
    return new DatabaseTestHelper(config);
};