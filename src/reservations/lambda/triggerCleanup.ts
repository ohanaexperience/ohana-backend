import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import jsonBodyParser from "@middy/http-json-body-parser";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { ReservationCleanupService } from "../services/cleanup";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });

export const handler = middy(async (event) => {
    console.log("Manual cleanup trigger received");

    // This endpoint requires admin auth in production
    // For now, we'll allow it for testing

    try {
        const cleanupService = new ReservationCleanupService({ database: db });
        
        // Run all cleanup tasks
        const results = await cleanupService.runAllCleanupTasks();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Cleanup completed successfully",
                results,
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error("Cleanup failed:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "CLEANUP_FAILED",
                message: "Failed to run cleanup tasks",
                details: error instanceof Error ? error.message : "Unknown error",
            }),
        };
    }
})
    .use(httpHeaderNormalizer())
    .use(jsonBodyParser())
    .use(cors());