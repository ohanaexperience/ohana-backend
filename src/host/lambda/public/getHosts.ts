import { APIGatewayProxyHandler } from "aws-lambda";

import { HostController } from "@/host/controllers/host";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

export const handler: APIGatewayProxyHandler = async (event) => {
    let database: ReturnType<typeof DatabaseFactory.create> | null = null;

    try {
        // Parse query parameters
        const queryParams = event.queryStringParameters || {};
        const bio = queryParams.bio;
        const languages = queryParams.languages
            ? queryParams.languages.split(",")
            : undefined;
        const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : undefined;
        const offset = queryParams.offset ? parseInt(queryParams.offset, 10) : undefined;

        // Setup database connection
        const dbConfig = createDatabaseConfig();
        database = DatabaseFactory.create({ postgres: dbConfig });
        await database.connect();

        // Create controller and handle request
        const controller = new HostController({ database });
        const result = await controller.getHosts({
            bio,
            languages,
            limit,
            offset,
        });

        return result;
    } catch (error) {
        console.error("getHosts handler error:", error);

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