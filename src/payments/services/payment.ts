import Stripe from "stripe";
import { PaymentServiceOptions } from "../types";
import Postgres from "@/database/postgres";
import ERRORS from "@/errors";

interface CreatePaymentIntentParams {
    amount: number; // Amount in cents (e.g., 6969 for $69.69)
    reservationId: string;
    userId: string;
    metadata?: Record<string, string>;
    idempotencyKey: string;
    stripeCustomerId?: string;
    paymentMethodId?: string;
    savePaymentMethod?: boolean;
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
            paymentMethodId,
            savePaymentMethod = false,
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
            // Create or retrieve Stripe customer if needed
            let customerId = stripeCustomerId;
            if (!customerId && (savePaymentMethod || paymentMethodId)) {
                const user = await this.db.users.getById(userId);
                if (!user) {
                    throw new Error(ERRORS.USER.NOT_FOUND.CODE);
                }

                if (!user.stripeCustomerId) {
                    // Create new Stripe customer
                    const customer = await this.stripe.customers.create({
                        email: user.email || undefined,
                        metadata: {
                            userId,
                        },
                    });
                    customerId = customer.id;
                    
                    // Update user with Stripe customer ID
                    await this.db.users.update(userId, {
                        stripeCustomerId: customerId,
                    });
                } else {
                    customerId = user.stripeCustomerId;
                }
            }

            // Create Stripe payment intent
            const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
                amount: amount, // Amount is already in cents
                currency: "usd",
                capture_method: "manual", // Don't capture immediately
                metadata: {
                    reservationId,
                    userId,
                    ...metadata,
                },
            };

            if (customerId) {
                paymentIntentParams.customer = customerId;
            }

            if (paymentMethodId) {
                // For saved payment methods, attach and confirm immediately
                paymentIntentParams.payment_method = paymentMethodId;
                paymentIntentParams.confirm = true;
                paymentIntentParams.off_session = true;
                // Don't use automatic_payment_methods when specifying a payment method
            } else {
                // For new payment methods, let frontend handle collection
                paymentIntentParams.automatic_payment_methods = {
                    enabled: true,
                };
            }

            if (savePaymentMethod && customerId) {
                paymentIntentParams.setup_future_usage = "off_session";
            }

            const paymentIntent = await this.stripe.paymentIntents.create(
                paymentIntentParams,
                {
                    idempotencyKey: `pi_${idempotencyKey}`,
                }
            );

            // Store payment record
            const payment = await this.db.payments.create({
                reservationId,
                paymentIntentId: paymentIntent.id,
                amount: amount, // Amount is already in cents
                currency: "usd",
                status: "pending",
                stripeCustomerId: customerId,
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

            // Save payment method if it was requested
            if (capturedPayment.setup_future_usage === "off_session" && capturedPayment.payment_method) {
                await this.savePaymentMethodFromIntent(capturedPayment);
            }

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

    async getPaymentIntent(paymentIntentId: string) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error: any) {
            console.error("Failed to retrieve payment intent:", error);
            throw new Error(ERRORS.PAYMENT.NOT_FOUND.CODE);
        }
    }

    async updatePaymentIntent(paymentIntentId: string, params: Stripe.PaymentIntentUpdateParams) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.update(paymentIntentId, params);
            
            // Update local payment record if status changed
            const payment = await this.db.payments.getByPaymentIntentId(paymentIntentId);
            if (payment && paymentIntent.status === 'succeeded') {
                await this.db.payments.updateStatus(payment.id, {
                    status: 'captured',
                    chargeId: paymentIntent.latest_charge as string,
                    capturedAt: new Date(),
                    paymentMethodType: paymentIntent.payment_method_types[0],
                });
            }
            
            return paymentIntent;
        } catch (error: any) {
            console.error("Failed to update payment intent:", error);
            if (error.type === 'StripeCardError') {
                throw new Error(ERRORS.PAYMENT.CARD_DECLINED.CODE);
            }
            throw new Error(ERRORS.PAYMENT.PROCESSING_FAILED.CODE);
        }
    }

    async isPaymentIntentExpired(paymentIntent: Stripe.PaymentIntent): Promise<boolean> {
        // Stripe payment intents expire after 24 hours if not confirmed
        const createdAt = new Date(paymentIntent.created * 1000);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        // Consider expired if older than 23 hours (1 hour buffer)
        return hoursSinceCreation > 23;
    }

    async getPaymentIntentStatus(paymentIntentId: string) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            
            return {
                status: paymentIntent.status,
                requiresAction: paymentIntent.status === 'requires_action',
                paymentMethod: paymentIntent.payment_method ? {
                    id: paymentIntent.payment_method as string,
                    types: paymentIntent.payment_method_types
                } : null,
                lastError: paymentIntent.last_payment_error ? {
                    code: paymentIntent.last_payment_error.code,
                    message: paymentIntent.last_payment_error.message,
                    type: paymentIntent.last_payment_error.type
                } : null,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                created: paymentIntent.created,
                captureMethod: paymentIntent.capture_method
            };
        } catch (error: any) {
            console.error("Failed to get payment intent status:", error);
            throw new Error(ERRORS.PAYMENT.NOT_FOUND.CODE);
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
            const previouslyRefunded = payment.refundedAmount || 0;
            const refundAmount =
                amount || payment.amount - previouslyRefunded;

            if (refundAmount <= 0) {
                throw new Error(ERRORS.PAYMENT.ALREADY_REFUNDED.CODE);
            }

            if (refundAmount > payment.amount - previouslyRefunded) {
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
            const newRefundedAmount = previouslyRefunded + refundAmount;
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
        const refunds = charge.refunds;
        const latestRefund = refunds?.data?.[0];
        
        await this.db.payments.recordRefund(
            payment.id,
            refundedAmount,
            latestRefund?.id || "unknown",
            latestRefund?.reason || undefined
        );
    }

    private async savePaymentMethodFromIntent(paymentIntent: Stripe.PaymentIntent) {
        if (!paymentIntent.customer || !paymentIntent.payment_method) {
            return;
        }

        try {
            // Retrieve payment method details from Stripe
            const paymentMethod = await this.stripe.paymentMethods.retrieve(
                paymentIntent.payment_method as string
            );

            // Get user by Stripe customer ID
            const user = await this.db.users.getByStripeCustomerId(
                paymentIntent.customer as string
            );
            if (!user) {
                console.error("User not found for Stripe customer:", paymentIntent.customer);
                return;
            }

            // Check if payment method already exists
            const existingMethod = await this.db.paymentMethods.getByStripePaymentMethodId(
                paymentMethod.id
            );
            if (existingMethod) {
                return; // Already saved
            }

            // Save payment method
            await this.db.paymentMethods.create({
                userId: user.id,
                stripePaymentMethodId: paymentMethod.id,
                stripeCustomerId: paymentIntent.customer as string,
                type: paymentMethod.type,
                last4: paymentMethod.card?.last4,
                brand: paymentMethod.card?.brand,
                expMonth: paymentMethod.card?.exp_month?.toString(),
                expYear: paymentMethod.card?.exp_year?.toString(),
                isDefault: true, // Make it default if it's the first one
            });
        } catch (error) {
            console.error("Failed to save payment method:", error);
            // Don't throw - this is a non-critical operation
        }
    }

    async getUserPaymentMethods(userId: string) {
        const user = await this.db.users.getById(userId);
        if (!user || !user.stripeCustomerId) {
            return [];
        }

        // Sync with Stripe
        try {
            const stripeMethods = await this.stripe.paymentMethods.list({
                customer: user.stripeCustomerId,
                type: "card",
            });

            // Update local records
            for (const method of stripeMethods.data) {
                const existing = await this.db.paymentMethods.getByStripePaymentMethodId(
                    method.id
                );
                
                if (existing) {
                    // Update details if needed
                    await this.db.paymentMethods.updateStripeDetails(method.id, {
                        last4: method.card?.last4,
                        brand: method.card?.brand,
                        expMonth: method.card?.exp_month?.toString(),
                        expYear: method.card?.exp_year?.toString(),
                        status: "active",
                    });
                } else {
                    // Add new method
                    await this.db.paymentMethods.create({
                        userId: user.id,
                        stripePaymentMethodId: method.id,
                        stripeCustomerId: user.stripeCustomerId,
                        type: method.type,
                        last4: method.card?.last4,
                        brand: method.card?.brand,
                        expMonth: method.card?.exp_month?.toString(),
                        expYear: method.card?.exp_year?.toString(),
                    });
                }
            }
        } catch (error) {
            console.error("Failed to sync payment methods from Stripe:", error);
        }

        // Return local records
        return await this.db.paymentMethods.getByUserId(userId);
    }

    async addPaymentMethod(userId: string, paymentMethodId: string, nickname?: string) {
        const user = await this.db.users.getById(userId);
        if (!user) {
            throw new Error(ERRORS.USER.NOT_FOUND.CODE);
        }

        // Create Stripe customer if needed
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await this.stripe.customers.create({
                email: user.email || undefined,
                metadata: { userId },
            });
            stripeCustomerId = customer.id;
            
            await this.db.users.update(userId, {
                stripeCustomerId,
            });
        }

        // Attach payment method to customer
        await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomerId,
        });

        // Get payment method details
        const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

        // Save to database
        const isDefault = (await this.db.paymentMethods.getByUserId(userId)).length === 0;
        
        return await this.db.paymentMethods.create({
            userId,
            stripePaymentMethodId: paymentMethod.id,
            stripeCustomerId,
            type: paymentMethod.type,
            last4: paymentMethod.card?.last4,
            brand: paymentMethod.card?.brand,
            expMonth: paymentMethod.card?.exp_month?.toString(),
            expYear: paymentMethod.card?.exp_year?.toString(),
            nickname,
            isDefault,
        });
    }

    async removePaymentMethod(userId: string, paymentMethodId: string) {
        const paymentMethod = await this.db.paymentMethods.getById(paymentMethodId);
        if (!paymentMethod || paymentMethod.userId !== userId) {
            throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
        }

        // Detach from Stripe customer
        await this.stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

        // Soft delete from database
        await this.db.paymentMethods.delete(paymentMethodId, userId);
    }

    async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
        const paymentMethod = await this.db.paymentMethods.getById(paymentMethodId);
        if (!paymentMethod || paymentMethod.userId !== userId) {
            throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
        }

        // Update in database
        await this.db.paymentMethods.setAsDefault(paymentMethodId, userId);

        // Update default on Stripe customer
        const user = await this.db.users.getById(userId);
        if (user?.stripeCustomerId) {
            await this.stripe.customers.update(user.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethod.stripePaymentMethodId,
                },
            });
        }
    }
}
