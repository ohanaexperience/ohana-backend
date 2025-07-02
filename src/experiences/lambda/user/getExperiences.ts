import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { ExperienceController } from "../../controllers/experience";
import {
    UserExperienceSearchData,
    UserExperienceSearchSchema,
} from "../../validations";

import { DatabaseFactory } from "@/database";
import { zodValidator } from "@/middleware";

dayjs.extend(timezone);
dayjs.extend(utc);

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
const experienceController = new ExperienceController({ database: db });

export const handler = middy(async (event: UserExperienceSearchData) => {
    const { authorization } = event.headers;

    console.log("event", event);

    return await experienceController.userGetExperiences({
        authorization: authorization!,
        ...event.queryStringParameters,
    });
})
    .use(httpHeaderNormalizer())
    .use(zodValidator({ queryStringParameters: UserExperienceSearchSchema }))
    .use(cors());
