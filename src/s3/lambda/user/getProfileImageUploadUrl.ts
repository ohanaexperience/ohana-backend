import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { S3Client } from "@aws-sdk/client-s3";

import { S3Controller } from "../../controllers/s3";
import {
    GetProfileImageUploadUrlData,
    GetProfileImageUploadUrlSchema,
} from "../../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireQueryStringParameters, zodValidator } from "@/middleware";

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
});

export const handler = middy(async (event: GetProfileImageUploadUrlData) => {
    const { authorization } = event.headers;

    console.log("event", event);

    return await s3Controller.getProfileImageUploadUrl({
        authorization: authorization!,
        ...event.queryStringParameters,
    });
})
    .use(httpHeaderNormalizer())
    .use(requireQueryStringParameters())
    .use(
        zodValidator({ queryStringParameters: GetProfileImageUploadUrlSchema })
    )
    .use(cors());
