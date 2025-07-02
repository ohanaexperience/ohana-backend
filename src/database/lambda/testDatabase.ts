import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayEvent } from "aws-lambda";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { DatabaseController } from "../controllers/database";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const databaseController = new DatabaseController({ database: db });

export const handler = middy(async (event: APIGatewayEvent) => {
    console.log("event", event);

    return await databaseController.testDatabase();
})
    .use(httpHeaderNormalizer())
    .use(cors());
