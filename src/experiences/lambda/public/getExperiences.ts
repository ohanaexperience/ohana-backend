import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { ExperienceController } from "../../controllers/experience";
import {
    PublicExperienceSearchData,
    PublicExperienceSearchSchema,
} from "../../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { zodValidator } from "@/middleware";

dayjs.extend(timezone);
dayjs.extend(utc);

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const experienceController = new ExperienceController({ database: db });

export const handler = middy(async (event: PublicExperienceSearchData) => {
    console.log("event", event);

    return await experienceController.publicGetExperiences({
        ...event.queryStringParameters,
    });
})
    .use(httpHeaderNormalizer())
    .use(zodValidator({ queryStringParameters: PublicExperienceSearchSchema }))
    .use(cors());
