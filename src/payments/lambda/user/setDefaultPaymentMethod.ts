import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import cors from "@middy/http-cors";

import { PaymentMethodsController } from "../../controllers/payment-methods";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const paymentMethodsController = new PaymentMethodsController({ database: db });

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

    const { paymentMethodId } = event.pathParameters || {};

    if (!paymentMethodId) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                success: false,
                error: "Payment method ID is required",
            }),
        };
    }

    return await paymentMethodsController.setDefaultPaymentMethod({
        userId,
        paymentMethodId,
    });
})
    .use(httpHeaderNormalizer())
    .use(cors());