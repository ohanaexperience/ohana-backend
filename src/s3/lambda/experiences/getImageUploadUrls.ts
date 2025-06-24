import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { S3Client } from "@aws-sdk/client-s3";

import {
    GetExperienceImageUploadUrlsData,
    GetExperienceImageUploadUrlsSchema,
} from "../../validations";
import { S3Controller } from "../../controllers/s3";

import { DatabaseFactory } from "@/database";
import { requireBody, zodValidator } from "@/middleware";

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

export const handler = middy(
    async (event: GetExperienceImageUploadUrlsData) => {
        const { authorization } = event.headers;

        console.log("event", event);

        return await s3Controller.hostGetExperienceImageUploadUrls({
            authorization: authorization!,
            ...event.body,
        });
    }
)
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: GetExperienceImageUploadUrlsSchema }))
    .use(cors());
