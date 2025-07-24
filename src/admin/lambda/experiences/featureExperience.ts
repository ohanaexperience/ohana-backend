import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireAdmin, requirePathParameters, zodValidator } from "@/middleware";
import { FeatureExperienceData, FeatureExperiencePathSchema } from "@/admin/validations";

const dbConfig = createDatabaseConfig();
const database = DatabaseFactory.create({ postgres: dbConfig });
const adminController = new AdminController({ database });

export const handler = middy(async (event: FeatureExperienceData) => {
    const { authorization } = event.headers;
    const { experienceId } = event.pathParameters;

    return await adminController.featureExperience({
        authorization: authorization!,
        experienceId,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requirePathParameters())
    .use(zodValidator({ pathParameters: FeatureExperiencePathSchema }))
    .use(requireAdmin())
    .use(cors());