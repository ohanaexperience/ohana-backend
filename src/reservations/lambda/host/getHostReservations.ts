import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

import { HostReservationController } from "../../controllers/host";
import { getHostReservationsQuerySchema } from "../../validations/getHostReservations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { zodValidator } from "@/middleware";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const hostReservationController = new HostReservationController({
    database: db,
});

interface GetHostReservationsEvent {
    headers: {
        authorization?: string;
    };
    pathParameters?: {
        experienceId?: string;
    };
    queryStringParameters?: {
        experienceId?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
        limit?: string;
        offset?: string;
    };
}

export const handler = middy(async (event: GetHostReservationsEvent) => {
    const { authorization } = event.headers;
    const queryParams = event.queryStringParameters || {};
    
    // If experienceId is in path parameters, use it (for specific experience endpoint)
    if (event.pathParameters?.experienceId) {
        queryParams.experienceId = event.pathParameters.experienceId;
    }

    return await hostReservationController.getHostReservations({
        authorization: authorization!,
        queryParams,
    });
})
    .use(httpHeaderNormalizer())
    .use(zodValidator({ queryStringParameters: getHostReservationsQuerySchema }))
    .use(cors());