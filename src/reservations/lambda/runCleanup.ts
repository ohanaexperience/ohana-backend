import { ScheduledHandler } from "aws-lambda";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { ReservationCleanupService } from "../services/cleanup";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });

export const handler: ScheduledHandler = async (event, context) => {
    console.log("Running reservation cleanup", {
        eventId: event.id,
        time: event.time,
        account: event.account,
        region: event.region,
    });

    try {
        const cleanupService = new ReservationCleanupService({ database: db });
        
        // Run all cleanup tasks
        const results = await cleanupService.runAllCleanupTasks();

        console.log("Cleanup completed successfully", results);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Cleanup completed successfully",
                results,
            }),
        };
    } catch (error) {
        console.error("Cleanup failed:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Cleanup failed",
                error: error instanceof Error ? error.message : "Unknown error",
            }),
        };
    }
};