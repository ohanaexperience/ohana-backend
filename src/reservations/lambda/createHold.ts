import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { ReservationController } from "../controllers/reservation";
import { CreateHoldData, createHoldSchema } from "../validations/createHold";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reservationController = new ReservationController({
    database: db,
});

export const handler = middy(async (event: CreateHoldData) => {
    const { authorization, "x-idempotency-key": idempotencyKey } = event.headers;
    const {
        experienceId,
        timeSlotId,
        numberOfGuests,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests,
    } = event.body;

    return await reservationController.createHold({
        authorization: authorization!,
        experienceId,
        timeSlotId,
        numberOfGuests,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests,
        idempotencyKey: idempotencyKey!,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(zodValidator({
        headers: createHoldSchema.shape.headers,
        body: createHoldSchema.shape.body,
    }))
    .use(cors());