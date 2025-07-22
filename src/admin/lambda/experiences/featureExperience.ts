import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { APIGatewayProxyEvent } from "aws-lambda";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireBody } from "@/middleware";

const dbConfig = createDatabaseConfig();
const database = DatabaseFactory.create({ postgres: dbConfig });
const adminController = new AdminController({ database });

interface FeatureExperienceEvent extends APIGatewayProxyEvent {
    body: {
        featuredOrder?: number;
    };
}

export const handler = middy(async (event: FeatureExperienceEvent) => {
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

    return await adminController.featureExperience({
        authorization,
        experienceId,
        featuredOrder: event.body?.featuredOrder,
    });
})
    .use(cors())
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser());