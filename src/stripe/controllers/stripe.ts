import { StripeService } from "../services/stripe";
import { StripeServiceOptions } from "../types";

import ERRORS from "@/errors";

export class StripeController {
    private readonly stripeService: StripeService;

    constructor(opts: StripeServiceOptions) {
        this.stripeService = new StripeService(opts);
    }

    async createVerificationSession(request: { authorization: string }) {
        try {
            const result = await this.stripeService.createVerificationSession(
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
            case ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND
                            .CODE,
                        message:
                            ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND
                                .MESSAGE,
                    }),
                };

            case ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE,
                        message:
                            ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.MESSAGE,
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
