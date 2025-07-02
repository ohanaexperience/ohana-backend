import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { APIGatewayEvent } from "aws-lambda";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { ExperienceController } from "../../controllers/experience";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

dayjs.extend(timezone);
dayjs.extend(utc);

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const experienceController = new ExperienceController({ database: db });

export const handler = middy(async (event: APIGatewayEvent) => {
    const { authorization } = event.headers;

    console.log("event", event);

    return await experienceController.hostGetExperiences({
        authorization: authorization!,
    });
})
    .use(httpHeaderNormalizer())
    .use(cors());
