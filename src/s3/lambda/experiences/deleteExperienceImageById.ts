import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { S3Client } from "@aws-sdk/client-s3";

import { S3Controller } from "../../controllers/s3";
import {
    DeleteExperienceImageByIdData,
    DeleteExperienceImageByIdPathSchema,
} from "../../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requirePathParameters, zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
});
const s3Controller = new S3Controller({
    database: db,
    s3Client,
    bucketName: process.env.ASSETS_BUCKET_NAME!,
    assetsDomain: process.env.ASSETS_CDN_DOMAIN,
});

export const handler = middy(async (event: DeleteExperienceImageByIdData) => {
    const { authorization } = event.headers;
    const { experienceId, imageId } = event.pathParameters!;

    return await s3Controller.deleteExperienceImageById({
        authorization: authorization!,
        experienceId,
        imageId,
    });
})
    .use(httpHeaderNormalizer())
    .use(requirePathParameters())
    .use(
        zodValidator({
            pathParameters: DeleteExperienceImageByIdPathSchema,
        })
    )
    .use(cors());
