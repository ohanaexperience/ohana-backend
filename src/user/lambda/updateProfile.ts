import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { UserController } from "../controllers/user";
import { UpdateUserProfileData, UpdateUserProfileSchema } from "../validations";

import { DatabaseFactory } from "@/database";
import { requireBody, zodValidator } from "@/middleware";

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
