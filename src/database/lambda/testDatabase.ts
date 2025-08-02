import { Handler } from "aws-lambda";
import { sql } from "drizzle-orm";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

export const handler: Handler = async () => {
    console.log(
        "Emptying reservations, payments, and reservation_events tables..."
    );

    let database: ReturnType<typeof DatabaseFactory.create> | null = null;

    try {
        // Create database instance using factory
        console.log("Setting up database connection...");
        const dbConfig = createDatabaseConfig();
        database = DatabaseFactory.create({ postgres: dbConfig });

        await database.connect();
        console.log("Database connection established");

        // Empty tables in correct order (children first, then parent)
        console.log("Emptying reservation_events table...");
        await database.instance.execute(
            sql`TRUNCATE TABLE reservation_events CASCADE`
        );

        console.log("Emptying payments table...");
        await database.instance.execute(sql`TRUNCATE TABLE payments CASCADE`);

        console.log("Emptying reservations table...");
        await database.instance.execute(
            sql`TRUNCATE TABLE reservations CASCADE`
        );

        // Verify tables are empty
        const reservationCount = await database.instance.execute(
            sql`SELECT COUNT(*) FROM reservations`
        );
        const paymentCount = await database.instance.execute(
            sql`SELECT COUNT(*) FROM payments`
        );
        const eventCount = await database.instance.execute(
            sql`SELECT COUNT(*) FROM reservation_events`
        );

        console.log("Tables emptied successfully!");
        console.log(
            `Reservations remaining: ${reservationCount.rows[0].count}`
        );
        console.log(`Payments remaining: ${paymentCount.rows[0].count}`);
        console.log(
            `Reservation events remaining: ${eventCount.rows[0].count}`
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Tables emptied successfully",
                results: {
                    reservations: reservationCount.rows[0].count,
                    payments: paymentCount.rows[0].count,
                    reservationEvents: eventCount.rows[0].count,
                },
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error("Failed to empty tables:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to empty tables",
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
