import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayProxyEvent } from "aws-lambda";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const database = DatabaseFactory.create({ postgres: dbConfig });
const adminController = new AdminController({ database });

export const handler = middy(async (event: APIGatewayProxyEvent) => {
    const { authorization } = event.headers;
    const experienceId = event.pathParameters?.experienceId;

    if (!authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "Authorization header required" }),
        };
    }

    if (!experienceId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "experienceId is required" }),
        };
    }

    return await adminController.unfeatureExperience({
        authorization,
        experienceId,
    });
})
    .use(cors())
    .use(httpHeaderNormalizer());