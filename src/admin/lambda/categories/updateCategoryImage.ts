import { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { S3Service } from "@/s3/services/s3";

export const handler: APIGatewayProxyHandler = async (event) => {
    let database: ReturnType<typeof DatabaseFactory.create> | null = null;

    try {
        const authorization = event.headers.Authorization || event.headers.authorization;
        if (!authorization) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Authorization header required" }),
            };
        }

        const categoryId = event.pathParameters?.categoryId;
        if (!categoryId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Category ID is required" }),
            };
        }

        const body = JSON.parse(event.body || "{}");
        const { imageId, imageUrl, key, mimeType } = body;

        if (!imageId || !imageUrl || !key || !mimeType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    message: "imageId, imageUrl, key, and mimeType are required" 
                }),
            };
        }

        // Setup database connection
        const dbConfig = createDatabaseConfig();
        database = DatabaseFactory.create({ postgres: dbConfig });
        await database.connect();

        // Setup S3
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || "us-east-1",
        });

        const s3Service = new S3Service({
            database,
            s3Client,
            bucketName: process.env.ASSETS_BUCKET_NAME!,
            assetsDomain: process.env.ASSETS_CDN_DOMAIN,
        });

        // Create controller and handle request
        const controller = new AdminController({ database, s3Service });
        const result = await controller.updateCategoryImage({
            authorization,
            categoryId: parseInt(categoryId, 10),
            imageId,
            imageUrl,
            key,
            mimeType,
        });

        return result;
    } catch (error) {
        console.error("updateCategoryImage handler error:", error);

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