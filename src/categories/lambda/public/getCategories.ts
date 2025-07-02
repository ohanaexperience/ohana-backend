import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { APIGatewayEvent } from "aws-lambda";

import { CategoryController } from "../../controllers/category";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const categoryController = new CategoryController({ database: db });

export const handler = middy(async (event: APIGatewayEvent) => {
    console.log("event", event);

    return await categoryController.getCategories();
})
    .use(httpHeaderNormalizer())
    .use(cors());
