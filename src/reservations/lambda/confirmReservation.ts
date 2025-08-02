import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { ReservationController } from "../controllers/reservation";
import { ConfirmReservationData, ConfirmReservationSchema } from "../validations/confirmReservation";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireBody, zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reservationController = new ReservationController({
    database: db,
});

export const handler = middy(async (event: ConfirmReservationData) => {
    const { reservationId, paymentIntentId } = event.body;

    return await reservationController.confirmReservation({
        reservationId,
        paymentIntentId,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: ConfirmReservationSchema }))
    .use(cors());