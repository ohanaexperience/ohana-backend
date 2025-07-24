import { Handler } from "aws-lambda";
import { DatabaseFactory } from "../index";
import { createDatabaseConfig } from "../proxy-config";
import { seedCategories } from "../seeds/categories";
import { seedCollectionItems } from "../seeds/collection_items";

export const handler: Handler = async () => {
    console.log("Starting database seeding...");

    try {
        const dbConfig = createDatabaseConfig();
        const db = DatabaseFactory.create({ postgres: dbConfig });
        await db.connect();
        console.log("Database connection established");

        // Run seed functions
        await seedCategories(db);
        await seedCollectionItems(db);

        console.log("Database seeding completed successfully!");

        await db.close();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Database seeding completed successfully",
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error("Seeding failed:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Database seeding failed",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            }),
        };
    }
};
