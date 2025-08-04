import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { APIGatewayEvent } from "aws-lambda";

import { CategoryController } from "../../controllers/category";

import ConnectionManager from "@/database/connection-manager";

// Reuse database connection across Lambda invocations
let categoryController: CategoryController | null = null;

export const handler = middy(async (event: APIGatewayEvent) => {
    console.log("event", event);

    // Initialize controller with reused connection if not already initialized
    if (!categoryController) {
        const connectionManager = ConnectionManager.getInstance();
        const db = await connectionManager.getConnection();
        categoryController = new CategoryController({ database: db });
    }

    return await categoryController.getCategories();
})
    .use(httpHeaderNormalizer())
    .use(cors());
