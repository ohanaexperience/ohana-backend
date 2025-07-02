import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { TimeSlotController } from "../controllers/timeSlot";
import { TimeSlotSearchSchema, TimeSlotSearchData } from "../validations";

import { DatabaseFactory } from "@/database";
import { requireQueryStringParameters, zodValidator } from "@/middleware";

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
