import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { TimeSlotController } from "../controllers/timeSlot";
import { TimeSlotSearchSchema, TimeSlotSearchData } from "../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireQueryStringParameters, zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const timeSlotController = new TimeSlotController({
    database: db,
});

export const handler = middy(async (event: TimeSlotSearchData) => {
    const { authorization } = event.headers;

    console.log("event", event);

    return await timeSlotController.getTimeSlots({
        authorization: authorization!,
        ...event.queryStringParameters,
    });
})
    .use(httpHeaderNormalizer())
    .use(requireQueryStringParameters())
    .use(zodValidator({ queryStringParameters: TimeSlotSearchSchema }))
    .use(cors());
