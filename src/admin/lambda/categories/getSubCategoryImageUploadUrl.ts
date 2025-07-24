import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";
import { S3Client } from "@aws-sdk/client-s3";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { S3Service } from "@/s3/services/s3";
import { requireAdmin, requirePathParameters, zodValidator } from "@/middleware";
import { GetSubCategoryImageUploadUrlData, GetSubCategoryImageUploadUrlPathSchema, GetSubCategoryImageUploadUrlQuerySchema } from "@/admin/validations";

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

export const handler = middy(async (event: GetSubCategoryImageUploadUrlData) => {
    const { subCategoryId } = event.pathParameters;
    const { mimeType } = event.queryStringParameters;

    return await adminController.getSubCategoryImageUploadUrl({
        subCategoryId: parseInt(subCategoryId, 10),
        mimeType,
    });
})
    .use(httpHeaderNormalizer())
    .use(requirePathParameters())
    .use(zodValidator({ 
        pathParameters: GetSubCategoryImageUploadUrlPathSchema,
        queryStringParameters: GetSubCategoryImageUploadUrlQuerySchema 
    }))
    .use(requireAdmin())
    .use(cors());