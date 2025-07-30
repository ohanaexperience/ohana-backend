import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { GetReviewStatsEvent, GetReviewStatsPathSchema } from "@/reviews/validations/public/getReviewStats";
import { ReviewController } from "@/reviews/controllers/review";
import { zodValidator } from "@/middleware";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

export const handler = middy(async (event: GetReviewStatsEvent) => {
  return await reviewController.getReviewStats(
    event.pathParameters.experienceId
  );
})
  .use(httpHeaderNormalizer())
  .use(zodValidator({ pathParameters: GetReviewStatsPathSchema }))
  .use(cors());