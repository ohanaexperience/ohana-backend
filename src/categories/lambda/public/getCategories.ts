import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { APIGatewayEvent } from "aws-lambda";

import { CategoryController } from "../../controllers/category";

import { DatabaseFactory } from "@/database";

const { DB_ENDPOINT, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT!,
        port: parseInt(DB_PORT!),
        database: DB_NAME!,
        user: DB_USER!,
        password: DB_PASSWORD!,
        ssl: false,
    },
});
const categoryController = new CategoryController({ database: db });

export const handler = middy(async (event: APIGatewayEvent) => {
    console.log("event", event);

    return await categoryController.getCategories();
})
    .use(httpHeaderNormalizer())
    .use(cors());
