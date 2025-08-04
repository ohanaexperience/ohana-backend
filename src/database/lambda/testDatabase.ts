import { Handler } from "aws-lambda";
import { sql } from "drizzle-orm";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

export const handler: Handler = async () => {
    console.log("Fetching contents of database tables...");

    let database: ReturnType<typeof DatabaseFactory.create> | null = null;

    try {
        // Create database instance using factory
        console.log("Setting up database connection...");
        const dbConfig = createDatabaseConfig();
        database = DatabaseFactory.create({ postgres: dbConfig });

        await database.connect();
        console.log("Database connection established");

        // Fetch contents of each table
        // console.log("Fetching users table...");
        // const users = await database.instance.execute(
        //     sql`SELECT * FROM users ORDER BY created_at DESC`
        // );

        console.log("Fetching hosts table...");
        const hosts = await database.instance.execute(
            sql`SELECT * FROM hosts ORDER BY created_at DESC`
        );

        // console.log("Fetching experiences table...");
        // const experiences = await database.instance.execute(
        //     sql`SELECT id, title, host_id, category_id, price_per_person, status, created_at FROM experiences ORDER BY created_at DESC`
        // );

        // console.log("Fetching reservations table...");
        // const reservations = await database.instance.execute(
        //     sql`SELECT * FROM reservations ORDER BY created_at DESC`
        // );

        // console.log("Fetching payments table...");
        // const payments = await database.instance.execute(
        //     sql`SELECT * FROM payments ORDER BY created_at DESC`
        // );

        // console.log("Fetching reservation_events table...");
        // const reservationEvents = await database.instance.execute(
        //     sql`SELECT * FROM reservation_events ORDER BY created_at DESC`
        // );

        // console.log("Fetching categories table...");
        // const categories = await database.instance.execute(
        //     sql`SELECT * FROM categories ORDER BY id`
        // );

        console.log("Fetching host_verifications table...");
        const hostVerifications = await database.instance.execute(
            sql`SELECT * FROM host_verifications ORDER BY created_at DESC`
        );

        // Delete records except for specific user_ids
        console.log(
            "Deleting host_verifications except for specific user_ids..."
        );
        const deleteResult = await database.instance.execute(
            sql`DELETE FROM host_verifications 
                WHERE user_id NOT IN (
                    'e438d438-2001-70a2-e9b4-091ca8df8d87', 
                    '244854e8-c051-70d5-bea0-e993356f29e2', 
                    'd438f498-7051-70d5-8987-d7d834efc9a2'
                )`
        );

        // Fetch updated host_verifications after deletion
        console.log("Fetching updated host_verifications table...");
        const updatedHostVerifications = await database.instance.execute(
            sql`SELECT * FROM host_verifications ORDER BY created_at DESC`
        );

        // Log counts for each table
        // console.log(`Users found: ${users.rows.length}`);
        console.log(`Hosts found: ${hosts.rows.length}`);
        console.log(`Hosts: ${JSON.stringify(hosts, null, 2)}`);
        console.log(
            `Host verifications found (before deletion): ${hostVerifications.rows.length}`
        );
        console.log(
            `Host verifications deleted: ${deleteResult.rowCount || 0}`
        );
        console.log(
            `Host verifications found (after deletion): ${updatedHostVerifications.rows.length}`
        );
        console.log(
            `Host verifications: ${JSON.stringify(
                updatedHostVerifications,
                null,
                2
            )}`
        );

        // // Log sample data if available
        // if (users.rows.length > 0) {
        //     console.log("Sample user:", JSON.stringify(users.rows[0], null, 2));
        // }
        // if (reservations.rows.length > 0) {
        //     console.log(
        //         "Sample reservation:",
        //         JSON.stringify(reservations.rows[0], null, 2)
        //     );
        // }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Database contents retrieved successfully",
                results: {
                    // users: {
                    //     count: users.rows.length,
                    //     data: users.rows,
                    // },
                    hosts: {
                        count: hosts.rows.length,
                        data: hosts.rows,
                    },
                    // experiences: {
                    //     count: experiences.rows.length,
                    //     data: experiences.rows,
                    // },
                    // reservations: {
                    //     count: reservations.rows.length,
                    //     data: reservations.rows,
                    // },
                    // payments: {
                    //     count: payments.rows.length,
                    //     data: payments.rows,
                    // },
                    // reservationEvents: {
                    //     count: reservationEvents.rows.length,
                    //     data: reservationEvents.rows,
                    // },
                    // categories: {
                    //     count: categories.rows.length,
                    //     data: categories.rows,
                    // },
                    hostVerifications: {
                        count: updatedHostVerifications.rows.length,
                        data: updatedHostVerifications.rows,
                        deletedCount: deleteResult.rowCount || 0,
                    },
                },
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error("Failed to fetch table contents:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to fetch table contents",
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
