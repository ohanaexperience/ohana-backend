import { S3Event } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";

import { S3Controller } from "../../controllers/s3";

import { DatabaseFactory } from "@/database";

const {
    DB_ENDPOINT,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    ASSETS_BUCKET_NAME,
} = process.env;

const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT!,
        port: parseInt(DB_PORT!),
        database: DB_NAME!,
        user: DB_USER!,
        password: DB_PASSWORD!,
        ssl: false,
    },
});
const s3Client = new S3Client({
    region: "us-east-1",
});
const s3Controller = new S3Controller({
    database: db,
    s3Client: s3Client,
    bucketName: ASSETS_BUCKET_NAME!,
});

export const handler = async (event: S3Event) => {
    console.log("event", event);

    return await s3Controller.handleProfileImageUpload(event);
};
