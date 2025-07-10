import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { HostController } from "../../controllers/host";
import {
    GetPublicHostProfileData,
    GetPublicHostProfilePathSchema,
} from "../../validations/public/getProfile";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requirePathParameters, zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const hostController = new HostController({ database: db });

export const handler = middy(async (event: GetPublicHostProfileData) => {
    const { hostId } = event.pathParameters;

    return await hostController.getPublicProfile({ hostId });
})
    .use(httpHeaderNormalizer())
    .use(requirePathParameters())
    .use(zodValidator({ pathParameters: GetPublicHostProfilePathSchema }))
    .use(cors());
