import Stripe from "stripe";
import { PaymentServiceOptions } from "../types";
import Postgres from "@/database/postgres";
import ERRORS from "@/errors";

interface CreatePaymentIntentParams {
    amount: number;
    reservationId: string;
    userId: string;
    metadata?: Record<string, string>;
    idempotencyKey: string;
    stripeCustomerId?: string;
}

interface ConfirmPaymentParams {
    paymentIntentId: string;
    reservationId: string;
}

export class PaymentService {
    private static readonly STRIPE_API_VERSION = "2025-04-30.basil";

    private readonly db: Postgres;
    private readonly stripe: Stripe;

    constructor({ database }: PaymentServiceOptions) {
        this.db = database;

        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error("STRIPE_SECRET_KEY is not configured");
        }

        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: PaymentService.STRIPE_API_VERSION,
            typescript: true,
        });
    }

    async createPaymentIntent(params: CreatePaymentIntentParams) {
        const {
            amount,
            reservationId,
            userId,
            metadata = {},
            idempotencyKey,
            stripeCustomerId,
        } = params;

        // Check for existing payment with idempotency key
        const existingPayment = await this.db.payments.getByIdempotencyKey(
            idempotencyKey
        );
        if (existingPayment) {
            return {
                paymentId: existingPayment.id,
                clientSecret: null, // Don't expose client secret on duplicate requests
                status: existingPayment.status,
            };
        }

        try {
            // Create Stripe payment intent
            const paymentIntent = await this.stripe.paymentIntents.create(
                {
                    amount: amount * 100, // Convert to cents
                    currency: "usd",
                    capture_method: "manual", // Don't capture immediately
                    automatic_payment_methods: {
                        enabled: true,
                    },
                    metadata: {
                        reservationId,
                        userId,
                        ...metadata,
                    },
                    ...(stripeCustomerId && { customer: stripeCustomerId }),
                },
                {
                    idempotencyKey: `pi_${idempotencyKey}`,
                }
            );

            // Store payment record
            const payment = await this.db.payments.create({
                reservationId,
                paymentIntentId: paymentIntent.id,
                amount: amount * 100, // Store in cents
                currency: "usd",
                status: "pending",
                stripeCustomerId,
                idempotencyKey,
            });

            return {
                paymentId: payment.id,
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                status: payment.status,
            };
        } catch (error: any) {
            if (error.type === "StripeCardError") {
                throw new Error(ERRORS.PAYMENT.CARD_DECLINED.CODE);
            } else if (error.type === "StripeInvalidRequestError") {
                throw new Error(ERRORS.PAYMENT.INVALID_REQUEST.CODE);
            }

            console.error("Stripe payment intent creation failed:", error);
            throw new Error(ERRORS.PAYMENT.PROCESSING_FAILED.CODE);
        }
    }

    async capturePayment(params: ConfirmPaymentParams) {
        const { paymentIntentId, reservationId } = params;

        try {
            // Get payment record
            const payment = await this.db.payments.getByPaymentIntentId(
                paymentIntentId
            );
            if (!payment) {
                throw new Error(ERRORS.PAYMENT.NOT_FOUND.CODE);
            }

            // Verify reservation matches
            if (payment.reservationId !== reservationId) {
                throw new Error(ERRORS.PAYMENT.RESERVATION_MISMATCH.CODE);
            }

            // Retrieve payment intent from Stripe
            const paymentIntent = await this.stripe.paymentIntents.retrieve(
                paymentIntentId
            );

            // Check if already captured
            if (paymentIntent.status === "succeeded") {
                return {
                    paymentId: payment.id,
                    status: "captured",
                };
            }

            // Ensure payment is authorized
            if (paymentIntent.status !== "requires_capture") {
                throw new Error(ERRORS.PAYMENT.NOT_AUTHORIZED.CODE);
            }

            // Capture the payment
            const capturedPayment = await this.stripe.paymentIntents.capture(
                paymentIntentId
            );

            // Update payment record
            await this.db.payments.updateStatus(payment.id, {
                status: "captured",
                chargeId: capturedPayment.latest_charge as string,
                capturedAt: new Date(),
                paymentMethodType: capturedPayment.payment_method_types[0],
            });

            return {
                paymentId: payment.id,
                status: "captured",
                chargeId: capturedPayment.latest_charge,
            };
        } catch (error: any) {
            if (error.type === "StripeCardError") {
                // Update payment with error
                const payment = await this.db.payments.getByPaymentIntentId(
                    paymentIntentId
                );
                if (payment) {
                    await this.db.payments.updateStatus(payment.id, {
                        status: "failed",
                        lastErrorCode: error.code,
                        lastErrorMessage: error.message,
                    });
                }
                throw new Error(ERRORS.PAYMENT.CAPTURE_FAILED.CODE);
            }

            console.error("Payment capture failed:", error);
            throw error;
        }
    }

    async cancelPayment(paymentIntentId: string) {
        try {
            const payment = await this.db.payments.getByPaymentIntentId(
                paymentIntentId
            );
            if (!payment) {
                return; // Already cancelled or doesn't exist
            }

            // Cancel on Stripe
            await this.stripe.paymentIntents.cancel(paymentIntentId);

            // Update payment record
            await this.db.payments.updateStatus(payment.id, {
                status: "cancelled",
            });
        } catch (error: any) {
            // Ignore already cancelled errors
            if (error.code !== "payment_intent_unexpected_state") {
                console.error("Payment cancellation failed:", error);
                throw error;
            }
        }
    }

    async refundPayment(paymentId: string, amount?: number, reason?: string) {
        try {
            const payment = await this.db.payments.getById(paymentId);
            if (!payment) {
                throw new Error(ERRORS.PAYMENT.NOT_FOUND.CODE);
            }

            if (payment.status !== "captured") {
                throw new Error(ERRORS.PAYMENT.NOT_CAPTURED.CODE);
            }

            // Calculate refund amount
            const refundAmount =
                amount || payment.amount - payment.refundedAmount;

            if (refundAmount <= 0) {
                throw new Error(ERRORS.PAYMENT.ALREADY_REFUNDED.CODE);
            }

            if (refundAmount > payment.amount - payment.refundedAmount) {
                throw new Error(ERRORS.PAYMENT.REFUND_EXCEEDS_CHARGE.CODE);
            }

            // Create refund on Stripe
            const refund = await this.stripe.refunds.create({
                payment_intent: payment.paymentIntentId,
                amount: refundAmount,
                reason:
                    (reason as Stripe.RefundCreateParams.Reason) ||
                    "requested_by_customer",
            });

            // Update payment record
            const newRefundedAmount = payment.refundedAmount + refundAmount;
            await this.db.payments.recordRefund(
                paymentId,
                newRefundedAmount,
                refund.id,
                reason
            );

            return {
                refundId: refund.id,
                amount: refundAmount,
                status: refund.status,
            };
        } catch (error: any) {
            console.error("Refund failed:", error);
            throw new Error(ERRORS.PAYMENT.REFUND_FAILED.CODE);
        }
    }

    async handleWebhook(event: Stripe.Event) {
        switch (event.type) {
            case "payment_intent.succeeded":
                await this.handlePaymentSuccess(
                    event.data.object as Stripe.PaymentIntent
                );
                break;

            case "payment_intent.payment_failed":
                await this.handlePaymentFailure(
                    event.data.object as Stripe.PaymentIntent
                );
                break;

            case "charge.refunded":
                await this.handleRefund(event.data.object as Stripe.Charge);
                break;
        }
    }

    private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
        const payment = await this.db.payments.getByPaymentIntentId(
            paymentIntent.id
        );
        if (!payment) return;

        await this.db.payments.updateStatus(payment.id, {
            status: "captured",
            chargeId: paymentIntent.latest_charge as string,
            capturedAt: new Date(),
        });
    }

    private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
        const payment = await this.db.payments.getByPaymentIntentId(
            paymentIntent.id
        );
        if (!payment) return;

        const lastError = paymentIntent.last_payment_error;
        await this.db.payments.updateStatus(payment.id, {
            status: "failed",
            lastErrorCode: lastError?.code || "unknown",
            lastErrorMessage: lastError?.message || "Payment failed",
        });
    }

    private async handleRefund(charge: Stripe.Charge) {
        const payment = await this.db.payments.getByPaymentIntentId(
            charge.payment_intent as string
        );
        if (!payment) return;

        const refundedAmount = charge.amount_refunded;
        await this.db.payments.recordRefund(
            payment.id,
            refundedAmount,
            charge.refunds.data[0]?.id || "unknown",
            charge.refunds.data[0]?.reason || undefined
        );
    }
}
