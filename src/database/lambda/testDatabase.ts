import { Handler } from "aws-lambda";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

export const handler: Handler = async () => {
    console.log("Fetching all host verifications...");

    let database: ReturnType<typeof DatabaseFactory.create> | null = null;

    try {
        // Create database instance using factory
        console.log("Setting up database connection...");
        const dbConfig = createDatabaseConfig();
        database = DatabaseFactory.create({ postgres: dbConfig });

        await database.connect();
        console.log("Database connection established");

        await database.hosts.create({
            id: "c43884c8-90f1-70e0-0872-f4c4dc000f0b",
        });

        // await database.hostVerifications.delete(
        //     "04588458-f091-70e3-a0f5-d9c22558afef"
        // );

        // // Get all host verifications
        // console.log("Fetching host verifications from database...");
        // const hostVerifications = await database.hostVerifications.getAll();
        // console.log(`Found ${hostVerifications.length} host verification(s)`);

        // return {
        //     statusCode: 200,
        //     body: JSON.stringify({
        //         message: "Host verifications retrieved successfully",
        //         data: hostVerifications,
        //         count: hostVerifications.length,
        //         timestamp: new Date().toISOString(),
        //     }),
        // };
    } catch (error) {
        console.error("Failed to fetch host verifications:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to fetch host verifications",
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
