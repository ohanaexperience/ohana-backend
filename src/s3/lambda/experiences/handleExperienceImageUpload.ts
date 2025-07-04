import { S3Event } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";

import { S3Controller } from "../../controllers/s3";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const {
    ASSETS_BUCKET_NAME,
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
    assetsDomain: process.env.ASSETS_DOMAIN,
});

export const handler = async (event: S3Event) => {
    console.log("=== S3 Experience Image Upload Trigger ===");
    console.log("Event:", JSON.stringify(event, null, 2));
    
    if (event.Records && event.Records.length > 0) {
        const record = event.Records[0];
        console.log("S3 Bucket:", record.s3.bucket.name);
        console.log("S3 Key:", record.s3.object.key);
        console.log("Event Name:", record.eventName);
    }

    try {
        const result = await s3Controller.handleExperienceImageUpload(event);
        console.log("=== Trigger completed successfully ===");
        console.log("Result:", result);
        return result;
    } catch (error) {
        console.error("=== Trigger failed ===");
        console.error("Error:", error);
        throw error;
    }
};
