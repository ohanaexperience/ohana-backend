import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { APIGatewayEvent } from "aws-lambda";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { HostController } from "@/host/controllers/host";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const hostController = new HostController({ database: db });

export const handler = middy(async (event: APIGatewayEvent) => {
    const { authorization } = event.headers;

    if (!authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized" }),
        };
    }

    return await hostController.getProfile({ authorization });
})
    .use(httpHeaderNormalizer())
    .use(cors());