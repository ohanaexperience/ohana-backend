import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { GetMyReviewsEvent, GetMyReviewsQuerySchema } from "@/reviews/validations/user/getMyReviews";
import { ReviewController } from "@/reviews/controllers/review";
import { zodValidator } from "@/middleware";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

export const handler = middy(async (event: GetMyReviewsEvent) => {
  const userId = event.requestContext.authorizer?.claims?.sub;

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required"
      })
    };
  }

  return await reviewController.getMyReviews({
    userId,
    ...event.queryStringParameters
  });
})
  .use(httpHeaderNormalizer())
  .use(zodValidator({ queryStringParameters: GetMyReviewsQuerySchema }))
  .use(cors());