import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayEvent } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { S3Controller } from "../../controllers/s3";
import { DeleteExperienceImageByIdRequestSchema } from "../../validations";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const s3Controller = new S3Controller({ 
    database: db,
    s3Client,
    bucketName: process.env.ASSETS_BUCKET_NAME!,
    assetsDomain: process.env.ASSETS_DOMAIN,
});

export const handler = middy(async (event: APIGatewayEvent) => {
    const validatedRequest = DeleteExperienceImageByIdRequestSchema.parse({
        authorization: event.headers.authorization,
        experienceId: event.pathParameters?.experienceId,
        imageId: event.pathParameters?.imageId,
    });

    return await s3Controller.deleteExperienceImageById(validatedRequest);
})
    .use(httpHeaderNormalizer())
    .use(cors());