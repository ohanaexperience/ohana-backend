import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";
import { S3Client } from "@aws-sdk/client-s3";

import { getReviewImageUploadUrlValidation } from "@/reviews/validations/user/getReviewImageUploadUrl";
import { ReviewController } from "@/reviews/controllers/review";
import { requireBody, zodValidator } from "@/middleware";
import { S3Service } from "@/s3/services/s3";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const { ASSETS_BUCKET_NAME } = process.env;

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const s3Client = new S3Client({
    region: "us-east-1",
});
const s3Service = new S3Service({
    database: db,
    s3Client,
    bucketName: ASSETS_BUCKET_NAME!,
});
const reviewController = new ReviewController({ database: db, s3Service });

export const handler = middy(async (event: any) => {
    const userId = event.requestContext.authorizer?.claims?.sub;
    const { reviewId } = event.pathParameters;

    return await reviewController.getReviewImageUploadUrl({
        userId,
        reviewId,
        ...event.body,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({
        pathParameters: getReviewImageUploadUrlValidation.shape.pathParameters,
        body: getReviewImageUploadUrlValidation.shape.body
    }))
    .use(cors());