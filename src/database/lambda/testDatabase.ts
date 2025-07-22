import { Handler } from "aws-lambda";
import { sql } from "drizzle-orm";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

export const handler: Handler = async () => {
    console.log("Deleting all experiences from database...");

    let database: ReturnType<typeof DatabaseFactory.create> | null = null;

    try {
        // Create database instance using factory
        console.log("Setting up database connection...");
        const dbConfig = createDatabaseConfig();
        database = DatabaseFactory.create({ postgres: dbConfig });

        await database.connect();
        console.log("Database connection established");

        // Create host verification first
        // await database.hostVerifications.create({
        //     userId: "c4e834a8-0091-70ce-0edf-0cfb462c39c9",
        //     provider: "stripe_identity",
        //     status: "approved",
        //     submittedAt: new Date(),
        //     approvedAt: new Date(),
        // });

        // await database.hosts.create({
        //     id: "c4e834a8-0091-70ce-0edf-0cfb462c39c9",
        // });

        // await database.hostVerifications.delete(
        //     "c418c438-9041-7091-430f-977eafebd85c"
        // );
        // await database.users.delete("c418c438-9041-7091-430f-977eafebd85c");

        const hostVerifications = await database.hostVerifications.getAll();
        const hosts = await database.hosts.getAll();
        // const users = await database.users.getAll();

        // console.log("users", users);
        console.log("hosts", hosts);
        console.log("hostVerifications", hostVerifications);

        return {
            statusCode: 200,
            body: JSON.stringify({
                hostVerifications,
                hosts,
                // users,
            }),
        };
    } catch (error) {
        console.error("Failed to delete experiences:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to delete experiences",
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
