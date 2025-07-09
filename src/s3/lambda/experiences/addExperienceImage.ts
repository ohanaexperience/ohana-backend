import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { S3Client } from "@aws-sdk/client-s3";

import { S3Controller } from "../../controllers/s3";
import {
    AddExperienceImageData,
    AddExperienceImagePathSchema,
    AddExperienceImageBodySchema,
} from "../../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requirePathParameters, requireBody, zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
});
const s3Controller = new S3Controller({
    database: db,
    s3Client,
    bucketName: process.env.ASSETS_BUCKET_NAME!,
    assetsDomain: process.env.ASSETS_DOMAIN,
});

export const handler = middy(async (event: AddExperienceImageData) => {
    const { authorization } = event.headers;
    const { experienceId } = event.pathParameters;
    const { imageType, mimeType } = event.body;

    return await s3Controller.addExperienceImage({
        authorization: authorization!,
        experienceId,
        imageType,
        mimeType,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requirePathParameters())
    .use(requireBody())
    .use(
        zodValidator({
            pathParameters: AddExperienceImagePathSchema,
            body: AddExperienceImageBodySchema,
        })
    )
    .use(cors());