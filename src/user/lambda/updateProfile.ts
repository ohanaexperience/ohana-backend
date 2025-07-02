import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { UserController } from "../controllers/user";
import { UpdateUserProfileData, UpdateUserProfileSchema } from "../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireBody, zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const userController = new UserController({
    database: db,
});

export const handler = middy(async (event: UpdateUserProfileData) => {
    const { authorization } = event.headers;

    console.log("event", event);

    return await userController.updateProfile({
        authorization: authorization!,
        ...event.body,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: UpdateUserProfileSchema }))
    .use(cors());
