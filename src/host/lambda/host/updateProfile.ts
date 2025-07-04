import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { UpdateProfileData, UpdateProfileSchema } from "../../validations";
import { HostController } from "../../controllers/host";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireBody, zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const hostController = new HostController({ database: db });

export const handler = middy(async (event: UpdateProfileData) => {
    const { authorization } = event.headers;
    const { bio, languages } = event.body;

    console.log("event", event);

    if (!authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized" }),
        };
    }

    return await hostController.updateProfile({ authorization, bio, languages });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: UpdateProfileSchema }))
    .use(cors());