import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { RespondToReviewEvent, RespondToReviewBodySchema, RespondToReviewPathSchema } from "@/reviews/validations/host/respondToReview";
import { ReviewController } from "@/reviews/controllers/review";
import { requireBody, zodValidator } from "@/middleware";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

export const handler = middy(async (event: RespondToReviewEvent) => {
  const userId = event.requestContext.authorizer?.claims?.sub;

  return await reviewController.respondToReview({
    userId,
    reviewId: event.pathParameters.reviewId,
    response: event.body.response
  });
})
  .use(httpHeaderNormalizer())
  .use(httpJsonBodyParser())
  .use(requireBody())
  .use(zodValidator({ 
    pathParameters: RespondToReviewPathSchema,
    body: RespondToReviewBodySchema 
  }))
  .use(cors());