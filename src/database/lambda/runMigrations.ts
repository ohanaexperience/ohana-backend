import { Handler } from "aws-lambda";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

export const handler: Handler = async () => {
    console.log("Starting database migrations using Drizzle...");

    let database: any = null;

    try {
        // Create database instance using factory
        console.log("Setting up database connection...");
        const dbConfig = createDatabaseConfig();
        database = DatabaseFactory.create({ postgres: dbConfig });

        await database.connect();
        console.log("Database connection established");

        if (!database.instance) {
            throw new Error("Database instance not available after connection");
        }

        // Run Drizzle migrations
        console.log("Running Drizzle migrations...");
        const migrationsFolder = path.resolve(__dirname, "../../../drizzle");
        console.log("Migrations folder:", migrationsFolder);

        await migrate(database.instance, { migrationsFolder });
        console.log("Drizzle migrations completed successfully");

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Migrations completed successfully using Drizzle",
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error("Migration failed:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Migration failed",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            }),
        };
    } finally {
        // Always close database connection
        if (database) {
            await database.close();
        }
    }
};
