import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { ReservationController } from "../controllers/reservation";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reservationController = new ReservationController({ database: db });

export const handler = middy(async (event: any) => {
    const { authorizer } = event.requestContext;
    const userId = authorizer?.claims?.sub || authorizer?.userId;

    if (!userId) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                success: false,
                error: "Unauthorized",
            }),
        };
    }

    const { reservationId } = event.pathParameters || {};

    if (!reservationId) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                success: false,
                error: "Reservation ID is required",
            }),
        };
    }

    return await reservationController.getPaymentStatus({
        userId,
        reservationId,
    });
})
    .use(httpHeaderNormalizer())
    .use(cors());