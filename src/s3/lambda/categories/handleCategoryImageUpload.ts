import { S3Event } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";

import { S3Controller } from "../../controllers/s3";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const {
    ASSETS_BUCKET_NAME,
    ASSETS_CDN_DOMAIN,
} = process.env;

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const s3Client = new S3Client({
    region: "us-east-1",
});
const s3Controller = new S3Controller({
    database: db,
    s3Client: s3Client,
    bucketName: ASSETS_BUCKET_NAME!,
    assetsDomain: ASSETS_CDN_DOMAIN,
});

export const handler = async (event: S3Event) => {
    console.log("Category image upload event", event);

    return await s3Controller.handleCategoryImageUpload(event);
};