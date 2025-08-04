import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { HostReservationController } from "../../controllers/host";
import { CompleteReservationBody, completeReservationBodySchema } from "../../validations/completeReservation";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const hostReservationController = new HostReservationController({
    database: db,
});

interface CompleteReservationEvent {
    headers: {
        authorization?: string;
    };
    pathParameters: {
        reservationId: string;
    };
    body: CompleteReservationBody;
}

export const handler = middy(async (event: CompleteReservationEvent) => {
    const { authorization } = event.headers;
    const { reservationId } = event.pathParameters;
    const body = event.body || {};

    return await hostReservationController.completeReservation({
        authorization: authorization!,
        reservationId,
        body,
    });
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(zodValidator({ body: completeReservationBodySchema }))
    .use(cors());