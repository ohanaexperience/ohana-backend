import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayProxyEvent } from "aws-lambda";
import { z } from "zod";

import { CollectionService } from "../../services/collections";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { zodValidator } from "@/middleware";

const QuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    offset: z.coerce.number().min(0).optional().default(0),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
});

type CollectionQueryData = Omit<APIGatewayProxyEvent, "queryStringParameters"> & {
    queryStringParameters: z.infer<typeof QuerySchema>;
};

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const collectionService = new CollectionService({ database: db });

export const handler = middy(async (event: CollectionQueryData) => {
    try {
        const collectionSlug = event.pathParameters?.slug;
        
        if (!collectionSlug) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Collection slug is required"
                })
            };
        }

        // Check if collection exists
        const collection = await db.experienceCollections.getCollectionBySlug(collectionSlug);
        if (!collection) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: "Collection not found"
                })
            };
        }

        const experiences = await collectionService.getCollectionExperiences(
            collectionSlug,
            event.queryStringParameters
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                collection: {
                    slug: collection.slug,
                    name: collection.name,
                    description: collection.description,
                    type: collection.type
                },
                experiences,
                pagination: {
                    limit: event.queryStringParameters.limit,
                    offset: event.queryStringParameters.offset,
                    total: experiences.length
                }
            })
        };
    } catch (error) {
        console.error("Error fetching collection experiences:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Failed to fetch collection experiences"
            })
        };
    }
})
    .use(httpHeaderNormalizer())
    .use(zodValidator({ queryStringParameters: QuerySchema }))
    .use(cors());