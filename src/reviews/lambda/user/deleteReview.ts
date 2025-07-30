import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { DeleteReviewEvent, DeleteReviewPathSchema } from "@/reviews/validations/user/deleteReview";
import { ReviewController } from "@/reviews/controllers/review";
import { zodValidator } from "@/middleware";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

export const handler = middy(async (event: DeleteReviewEvent) => {
  const userId = event.requestContext.authorizer?.claims?.sub;

  return await reviewController.deleteReview({
    userId,
    reviewId: event.pathParameters.reviewId
  });
})
  .use(httpHeaderNormalizer())
  .use(zodValidator({ pathParameters: DeleteReviewPathSchema }))
  .use(cors());