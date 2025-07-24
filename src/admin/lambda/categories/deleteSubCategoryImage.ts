import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";
import { S3Client } from "@aws-sdk/client-s3";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { S3Service } from "@/s3/services/s3";
import { requireAdmin, requirePathParameters, zodValidator } from "@/middleware";
import { DeleteSubCategoryImageData, DeleteSubCategoryImagePathSchema } from "@/admin/validations";

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

export const handler = middy(async (event: DeleteSubCategoryImageData) => {
    const { authorization } = event.headers;
    const { categoryId, subCategoryId } = event.pathParameters;

    return await adminController.deleteSubCategoryImage({
        authorization: authorization!,
        categoryId: parseInt(categoryId, 10),
        subCategoryId: parseInt(subCategoryId, 10),
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requirePathParameters())
    .use(zodValidator({ pathParameters: DeleteSubCategoryImagePathSchema }))
    .use(requireAdmin())
    .use(cors());