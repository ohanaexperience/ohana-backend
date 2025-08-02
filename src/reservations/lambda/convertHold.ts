import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { ReservationController } from "../controllers/reservation";
import { ConvertHoldData, convertHoldSchema } from "../validations/convertHold";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reservationController = new ReservationController({
    database: db,
});

export const handler = middy(async (event: ConvertHoldData) => {
    const { authorization } = event.headers;
    const { holdId, paymentIntentId } = event.body;

    return await reservationController.convertHoldToReservation({
        authorization: authorization!,
        holdId,
        paymentIntentId,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(zodValidator({
        headers: convertHoldSchema.shape.headers,
        body: convertHoldSchema.shape.body,
    }))
    .use(cors());