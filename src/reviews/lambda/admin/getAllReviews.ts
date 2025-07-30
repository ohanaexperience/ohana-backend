import middy from "@middy/core";
import { requireAdmin } from "@/middleware/requireAdmin";
import { zodValidator } from "@/middleware/zodValidator";
import { getAllReviewsValidation } from "@/reviews/validations/admin/getAllReviews";
import { ReviewController } from "@/reviews/controllers/review";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

const getAllReviewsHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return reviewController.getAllReviews(
    event.queryStringParameters
  );
};

export const handler = middy(getAllReviewsHandler)
  .use(requireAdmin())
  .use(zodValidator(getAllReviewsValidation));