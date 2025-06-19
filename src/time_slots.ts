import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { DatabaseFactory } from "@/database";

import { requireQueryStringParameters, zodValidator } from "@/middleware";
import { decodeToken } from "@/utils";
import { TimeSlotsSearchSchema, TimeSlotsSearchData } from "@/validations";

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

dayjs.extend(utc);
dayjs.extend(timezone);

export const getTimeSlots = middy(async (event: TimeSlotsSearchData) => {
    const { authorization } = event.headers;
    const { experienceId, startDate, endDate } = event.queryStringParameters!;

    console.log("event", event);

    if (!authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized" }),
        };
    }

    try {
        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const timeSlots = await db.timeSlots.getByDateRange({
            experienceId,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        });

        return {
            statusCode: 200,
            body: JSON.stringify(timeSlots),
        };
    } catch (err: any) {
        console.error("Error getting host experiences:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal server error",
                message: "An unexpected error occurred",
            }),
        };
    }
})
    .use(httpHeaderNormalizer())
    .use(requireQueryStringParameters())
    .use(zodValidator({ queryStringParameters: TimeSlotsSearchSchema }))
    .use(cors());
