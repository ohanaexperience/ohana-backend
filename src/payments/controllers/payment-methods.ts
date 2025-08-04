import { PaymentService } from "../services/payment";
import { PaymentServiceOptions } from "../types";
import ERRORS from "@/errors";

export class PaymentMethodsController {
    private paymentService: PaymentService;

    constructor(options: PaymentServiceOptions) {
        this.paymentService = new PaymentService(options);
    }

    async getUserPaymentMethods(request: { userId: string }) {
        try {
            const paymentMethods = await this.paymentService.getUserPaymentMethods(request.userId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: paymentMethods.map(method => ({
                        id: method.id,
                        stripePaymentMethodId: method.stripePaymentMethodId, // Add Stripe ID for frontend
                        type: method.type,
                        last4: method.last4,
                        brand: method.brand,
                        expMonth: method.expMonth,
                        expYear: method.expYear,
                        nickname: method.nickname,
                        isDefault: method.isDefault,
                        createdAt: method.createdAt,
                    })),
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async addPaymentMethod(request: { userId: string; paymentMethodId: string; nickname?: string }) {
        try {
            const paymentMethod = await this.paymentService.addPaymentMethod(
                request.userId,
                request.paymentMethodId,
                request.nickname
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: {
                        id: paymentMethod.id,
                        type: paymentMethod.type,
                        last4: paymentMethod.last4,
                        brand: paymentMethod.brand,
                        expMonth: paymentMethod.expMonth,
                        expYear: paymentMethod.expYear,
                        nickname: paymentMethod.nickname,
                        isDefault: paymentMethod.isDefault,
                        createdAt: paymentMethod.createdAt,
                    },
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async removePaymentMethod(request: { userId: string; paymentMethodId: string }) {
        try {
            await this.paymentService.removePaymentMethod(request.userId, request.paymentMethodId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: "Payment method removed successfully",
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async setDefaultPaymentMethod(request: { userId: string; paymentMethodId: string }) {
        try {
            await this.paymentService.setDefaultPaymentMethod(request.userId, request.paymentMethodId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: "Default payment method updated successfully",
                }),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: any) {
        console.error("Payment method controller error:", error);

        if (error.message?.includes(ERRORS.USER.NOT_FOUND.CODE)) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    error: ERRORS.USER.NOT_FOUND.MESSAGE,
                }),
            };
        }

        if (error.message?.includes(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE)) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    error: ERRORS.PAYMENT.METHOD_NOT_FOUND.MESSAGE,
                }),
            };
        }

        if (error.type === "StripeCardError") {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: error.message,
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: "An error occurred processing your request",
            }),
        };
    }
}