import { WebhookService } from "../services/webhook";
import { WebhookServiceOptions } from "../types";
import { StripeWebhookData } from "../validations";

import ERRORS from "@/errors";

export class WebhookController {
    private readonly webhookService: WebhookService;

    constructor(opts: WebhookServiceOptions) {
        this.webhookService = new WebhookService(opts);
    }

    async handleStripeWebhook(request: StripeWebhookData) {
        try {
            const result = await this.webhookService.handleStripeWebhook(
                request
            );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    private handleError(error: any) {
        switch (error.message) {
            case ERRORS.HOST.NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.HOST.NOT_FOUND.CODE,
                        message: ERRORS.HOST.NOT_FOUND.MESSAGE,
                    }),
                };

            default:
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "Internal server error",
                        message: "An unexpected error occurred",
                    }),
                };
        }
    }
}
