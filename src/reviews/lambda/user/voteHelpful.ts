import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { VoteHelpfulEvent, VoteHelpfulPathSchema } from "@/reviews/validations/user/voteHelpful";
import { ReviewController } from "@/reviews/controllers/review";
import { zodValidator } from "@/middleware";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

export const handler = middy(async (event: VoteHelpfulEvent) => {
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

  return await reviewController.voteHelpful({
    userId,
    reviewId: event.pathParameters.reviewId
  });
})
  .use(httpHeaderNormalizer())
  .use(zodValidator({ pathParameters: VoteHelpfulPathSchema }))
  .use(cors());