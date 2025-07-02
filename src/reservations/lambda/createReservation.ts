import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { ReservationController } from "../controllers/reservation";
import { CreateReservationData, CreateReservationSchema } from "../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireBody, zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reservationController = new ReservationController({
    database: db,
});

export const handler = middy(async (event: CreateReservationData) => {
    const { authorization } = event.headers;

    console.log("event", event);

    return await reservationController.createReservation({
        authorization: authorization!,
        ...event.body,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: CreateReservationSchema }))
    .use(cors());
