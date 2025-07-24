import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";
import { S3Client } from "@aws-sdk/client-s3";
import { APIGatewayEvent } from "aws-lambda";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { S3Service } from "@/s3/services/s3";
import { requireAdmin, requireBody, requirePathParameters } from "@/middleware";

const dbConfig = createDatabaseConfig();
const database = DatabaseFactory.create({ postgres: dbConfig });
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
});
const s3Service = new S3Service({
    database,
    s3Client,
    bucketName: process.env.ASSETS_BUCKET_NAME!,
    assetsDomain: process.env.ASSETS_CDN_DOMAIN,
});
const adminController = new AdminController({ database, s3Service });

type UpdateSubCategoryImageEvent = Omit<APIGatewayEvent, "pathParameters" | "body"> & {
    pathParameters: {
        subCategoryId: string;
    };
    body: {
        imageId: string;
        imageUrl: string;
        key: string;
        mimeType: string;
    };
};

export const handler = middy(async (event: UpdateSubCategoryImageEvent) => {
    const { authorization } = event.headers;
    const { subCategoryId } = event.pathParameters;
    const { imageId, imageUrl, key, mimeType } = event.body;

    return await adminController.updateSubCategoryImage({
        authorization: authorization!,
        subCategoryId: parseInt(subCategoryId, 10),
        imageId,
        imageUrl,
        key,
        mimeType,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(requirePathParameters())
    .use(requireAdmin())
    .use(cors());