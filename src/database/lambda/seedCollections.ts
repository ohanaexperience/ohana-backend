import { APIGatewayProxyResult } from "aws-lambda";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { DEFAULT_COLLECTIONS } from "@/constants/collections";

export const handler = async (): Promise<APIGatewayProxyResult> => {
    try {
        const dbConfig = createDatabaseConfig();
        const database = DatabaseFactory.create({ postgres: dbConfig });
        
        // Seed the collections from constants
        const results = await database.experienceCollections.seedCollections(DEFAULT_COLLECTIONS);
        
        // Count how many were created vs already existed
        const created = results.filter(r => r.status === 'created').length;
        const existing = results.filter(r => r.status === 'already_exists').length;

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Collections seeding completed",
                summary: {
                    total: results.length,
                    created,
                    alreadyExisted: existing
                },
                collections: results.map(({ status, ...collection }) => ({
                    id: collection.id,
                    slug: collection.slug,
                    name: collection.name,
                    type: collection.type,
                    status
                }))
            }),
        };
    } catch (error) {
        console.error("Error seeding collections:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to seed collections",
                error: error instanceof Error ? error.message : "Unknown error",
            }),
        };
    }
};