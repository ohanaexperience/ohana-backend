import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { ReservationController } from "../controllers/reservation";
import { GetUserReservationsData } from "../validations/getUserReservations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const reservationController = new ReservationController({
    database: db,
});

export const handler = middy(async (event: GetUserReservationsData) => {
    const { authorizer } = event.requestContext;
    const userId = authorizer?.claims?.sub || authorizer?.userId;
    
    if (!userId) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                error: "UNAUTHORIZED",
                message: "User ID not found in token"
            })
        };
    }
    
    const { status, limit, offset } = event.queryStringParameters || {};
    
    return await reservationController.getUserReservations({
        userId,
        status,
        limit,
        offset,
    });
})
    .use(httpHeaderNormalizer())
    .use(cors());