import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import {
    GetExperienceReviewsEvent,
    GetExperienceReviewsPathSchema,
    GetExperienceReviewsQuerySchema,
} from "@/reviews/validations/public/getExperienceReviews";
import { ReviewController } from "@/reviews/controllers/review";
import { zodValidator } from "@/middleware";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

export const handler = middy(async (event: GetExperienceReviewsEvent) => {
    const userId = event.requestContext.authorizer?.claims?.sub;

    return await reviewController.getExperienceReviews(
        event.pathParameters.experienceId,
        event.queryStringParameters,
        userId
    );
})
    .use(httpHeaderNormalizer())
    .use(
        zodValidator({
            pathParameters: GetExperienceReviewsPathSchema,
            queryStringParameters: GetExperienceReviewsQuerySchema,
        })
    )
    .use(cors());
