import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { APIGatewayEvent } from "aws-lambda";

import { UserController } from "../../controllers/user";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const userController = new UserController({
    database: db,
});

export const handler = middy(async (event: APIGatewayEvent) => {
    const userId = event.pathParameters?.userId;

    console.log("event", event);

    return await userController.getPublicProfile({
        userId: userId!,
    });
})
    .use(httpHeaderNormalizer())
    .use(cors());