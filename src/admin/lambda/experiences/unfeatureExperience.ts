import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { AdminController } from "@/admin/controllers/admin";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireAdmin, requirePathParameters, zodValidator } from "@/middleware";
import { UnfeatureExperienceData, UnfeatureExperiencePathSchema } from "@/admin/validations";

const dbConfig = createDatabaseConfig();
const database = DatabaseFactory.create({ postgres: dbConfig });
const adminController = new AdminController({ database });

export const handler = middy(async (event: UnfeatureExperienceData) => {
    const { authorization } = event.headers;
    const { experienceId } = event.pathParameters;

    return await adminController.unfeatureExperience({
        authorization: authorization!,
        experienceId,
    });
})
    .use(httpHeaderNormalizer())
    .use(requirePathParameters())
    .use(zodValidator({ pathParameters: UnfeatureExperiencePathSchema }))
    .use(requireAdmin())
    .use(cors());