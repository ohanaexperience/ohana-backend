import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayEvent } from "aws-lambda";

import { DatabaseFactory } from "@/database";
import { DatabaseController } from "../controllers/database";

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
const databaseController = new DatabaseController(db);

export const handler = middy(async (event: APIGatewayEvent) => {
    console.log("event", event);

    await databaseController.seedDatabase();
})
    .use(httpHeaderNormalizer())
    .use(cors());
