import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import {
    CreateReviewEvent,
    CreateReviewSchema,
    createReviewValidation,
} from "@/reviews/validations/user/createReview";
import { ReviewController } from "@/reviews/controllers/review";
import { requireBody, zodValidator } from "@/middleware";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

export const handler = middy(async (event: CreateReviewEvent) => {
    const userId = event.requestContext.authorizer?.claims?.sub;

    return await reviewController.createReview({
        userId,
        ...event.body,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: createReviewValidation }))
    .use(cors());
