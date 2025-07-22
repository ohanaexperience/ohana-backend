import { APIGatewayProxyHandler } from "aws-lambda";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

export const handler: APIGatewayProxyHandler = async (event) => {
    let database: ReturnType<typeof DatabaseFactory.create> | null = null;

    try {
        // Setup database connection
        const dbConfig = createDatabaseConfig();
        database = DatabaseFactory.create({ postgres: dbConfig });
        await database.connect();

        // Create controller and handle request
        const controller = new AdminController({ database });
        const result = await controller.getCategories();

        return result;
    } catch (error) {
        console.error("getCategories handler error:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error",
            }),
        };
    } finally {
        if (database) {
            await database.close();
        }
    }
};