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

    private isRedactedStripeError(error: any): boolean {
        return (
            error.type === 'StripeInvalidRequestError' &&
            error.code === 'resource_missing' &&
            error.message?.includes('redacted') &&
            error.message?.includes('verificationintent')
        );
    }

    private handleError(error: any) {
        // Handle direct Stripe errors that might bubble up
        if (this.isRedactedStripeError(error)) {
            console.log("Detected redacted session error in controller, treating as session redacted");
            return {
                statusCode: 409,
                body: JSON.stringify({
                    error: ERRORS.STRIPE.VERIFICATION.SESSION_REDACTED.CODE,
                    message: ERRORS.STRIPE.VERIFICATION.SESSION_REDACTED.MESSAGE,
                }),
            };
        }

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

            case ERRORS.STRIPE.VERIFICATION.SESSION_REDACTED.CODE:
                return {
                    statusCode: 409,
                    body: JSON.stringify({
                        error: ERRORS.STRIPE.VERIFICATION.SESSION_REDACTED.CODE,
                        message: ERRORS.STRIPE.VERIFICATION.SESSION_REDACTED.MESSAGE,
                    }),
                };

            default:
                console.error("Error in StripeController", error);

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
