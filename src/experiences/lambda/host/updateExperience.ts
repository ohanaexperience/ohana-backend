import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import {
    UpdateExperienceData,
    UpdateExperienceSchema,
} from "../../validations";
import { ExperienceController } from "../../controllers/experience";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireBody, zodValidator } from "@/middleware";

dayjs.extend(timezone);
dayjs.extend(utc);

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const experienceController = new ExperienceController({ database: db });

export const handler = middy(async (event: UpdateExperienceData) => {
    const { authorization } = event.headers;
    const { experienceId } = event.pathParameters;

    console.log("event", event);

    return await experienceController.hostUpdateExperience({
        authorization: authorization!,
        experienceId,
        ...event.body,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: UpdateExperienceSchema }))
    .use(cors());
