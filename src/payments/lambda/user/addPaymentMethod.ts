import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { PaymentMethodsController } from "../../controllers/payment-methods";
import { AddPaymentMethodSchema } from "../../validations";
import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { zodValidator } from "@/middleware";

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

    const { paymentMethodId, nickname } = event.body;

    return await paymentMethodsController.addPaymentMethod({
        userId,
        paymentMethodId,
        nickname,
    });
})
    .use(httpHeaderNormalizer())
    .use(jsonBodyParser())
    .use(zodValidator({ body: AddPaymentMethodSchema }))
    .use(cors());