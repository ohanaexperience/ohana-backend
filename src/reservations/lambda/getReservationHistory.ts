import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { ReservationController } from "../controllers/reservation";
import { GetReservationHistoryData } from "../validations/getReservationHistory";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requirePathParameters } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reservationController = new ReservationController({
    database: db,
});

export const handler = middy(async (event: GetReservationHistoryData) => {
    const { authorization } = event.headers;
    const { reservationId } = event.pathParameters;

    return await reservationController.getReservationHistory({
        authorization: authorization!,
        reservationId: reservationId!,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requirePathParameters())
    .use(cors());