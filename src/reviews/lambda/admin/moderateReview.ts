import middy from "@middy/core";
import { requireAdmin } from "@/middleware/requireAdmin";
import { zodValidator } from "@/middleware/zodValidator";
import { moderateReviewValidation } from "@/reviews/validations/admin/moderateReview";
import { ReviewController } from "@/reviews/controllers/review";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reviewController = new ReviewController({ database: db });

const moderateReviewHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return reviewController.moderateReview(
    event.pathParameters!.reviewId!,
    event.body
  );
};

export const handler = middy(moderateReviewHandler)
  .use(requireAdmin())
  .use(zodValidator(moderateReviewValidation));