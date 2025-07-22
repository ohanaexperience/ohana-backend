import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayProxyEvent } from "aws-lambda";

import { CollectionService } from "../../services/collections";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const collectionService = new CollectionService({ database: db });

export const handler = middy(async (event: APIGatewayProxyEvent) => {
    try {
        const collections = await collectionService.getAllCollections();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                collections: collections.map(c => ({
                    slug: c.slug,
                    name: c.name,
                    description: c.description,
                    type: c.type,
                    metadata: c.metadata
                }))
            })
        };
    } catch (error) {
        console.error("Error fetching collections:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Failed to fetch collections"
            })
        };
    }
})
    .use(httpHeaderNormalizer())
    .use(cors());