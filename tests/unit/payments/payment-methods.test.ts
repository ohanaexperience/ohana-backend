import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PaymentService } from "@/payments/services/payment";
import { PaymentServiceOptions } from "@/payments/types";
import Stripe from "stripe";

// Mock Stripe
jest.mock("stripe");

describe("Payment Methods", () => {
    let paymentService: PaymentService;
    let mockDb: any;
    let mockStripe: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock database
        mockDb = {
            users: {
                getById: jest.fn(),
                update: jest.fn(),
                getByStripeCustomerId: jest.fn(),
            },
            paymentMethods: {
                getByUserId: jest.fn(),
                getByStripePaymentMethodId: jest.fn(),
                getById: jest.fn(),
                create: jest.fn(),
                delete: jest.fn(),
                setAsDefault: jest.fn(),
                updateStripeDetails: jest.fn(),
            },
            payments: {
                getByIdempotencyKey: jest.fn(),
                create: jest.fn(),
                getByPaymentIntentId: jest.fn(),
                updateStatus: jest.fn(),
            },
        };

        // Mock Stripe instance
        mockStripe = {
            customers: {
                create: jest.fn(),
                update: jest.fn(),
            },
            paymentMethods: {
                attach: jest.fn(),
                detach: jest.fn(),
                retrieve: jest.fn(),
                list: jest.fn(),
            },
            paymentIntents: {
                create: jest.fn(),
                retrieve: jest.fn(),
                capture: jest.fn(),
            },
        };

        (Stripe as any).mockReturnValue(mockStripe);

        // Set environment variable
        process.env.STRIPE_SECRET_KEY = "sk_test_mock";

        const options: PaymentServiceOptions = { database: mockDb };
        paymentService = new PaymentService(options);
    });

    describe("addPaymentMethod", () => {
        it("should add a new payment method for a user", async () => {
            const userId = "user_123";
            const paymentMethodId = "pm_123";
            const nickname = "Personal Card";

            mockDb.users.getById.mockResolvedValue({
                id: userId,
                email: "test@example.com",
                stripeCustomerId: null,
            });

            mockStripe.customers.create.mockResolvedValue({
                id: "cus_123",
            });

            mockDb.users.update.mockResolvedValue([{
                id: userId,
                stripeCustomerId: "cus_123",
            }]);

            mockStripe.paymentMethods.attach.mockResolvedValue({
                id: paymentMethodId,
            });

            mockStripe.paymentMethods.retrieve.mockResolvedValue({
                id: paymentMethodId,
                type: "card",
                card: {
                    last4: "4242",
                    brand: "visa",
                    exp_month: 12,
                    exp_year: 2025,
                },
            });

            mockDb.paymentMethods.getByUserId.mockResolvedValue([]);

            mockDb.paymentMethods.create.mockResolvedValue({
                id: "method_123",
                userId,
                stripePaymentMethodId: paymentMethodId,
                type: "card",
                last4: "4242",
                brand: "visa",
                nickname,
                isDefault: true,
            });

            const result = await paymentService.addPaymentMethod(userId, paymentMethodId, nickname);

            expect(result).toMatchObject({
                userId,
                stripePaymentMethodId: paymentMethodId,
                type: "card",
                last4: "4242",
                brand: "visa",
                nickname,
                isDefault: true,
            });

            expect(mockStripe.customers.create).toHaveBeenCalledWith({
                email: "test@example.com",
                metadata: { userId },
            });

            expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith(paymentMethodId, {
                customer: "cus_123",
            });
        });

        it("should use existing Stripe customer if available", async () => {
            const userId = "user_123";
            const paymentMethodId = "pm_123";

            mockDb.users.getById.mockResolvedValue({
                id: userId,
                email: "test@example.com",
                stripeCustomerId: "cus_existing",
            });

            mockStripe.paymentMethods.attach.mockResolvedValue({
                id: paymentMethodId,
            });

            mockStripe.paymentMethods.retrieve.mockResolvedValue({
                id: paymentMethodId,
                type: "card",
                card: {
                    last4: "4242",
                    brand: "visa",
                    exp_month: 12,
                    exp_year: 2025,
                },
            });

            mockDb.paymentMethods.getByUserId.mockResolvedValue([
                { id: "existing_method" },
            ]);

            mockDb.paymentMethods.create.mockResolvedValue({
                id: "method_123",
                userId,
                stripePaymentMethodId: paymentMethodId,
                isDefault: false, // Not default since there's already a method
            });

            await paymentService.addPaymentMethod(userId, paymentMethodId);

            expect(mockStripe.customers.create).not.toHaveBeenCalled();
            expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith(paymentMethodId, {
                customer: "cus_existing",
            });
        });
    });

    describe("removePaymentMethod", () => {
        it("should remove a payment method", async () => {
            const userId = "user_123";
            const paymentMethodId = "method_123";

            mockDb.paymentMethods.getById.mockResolvedValue({
                id: paymentMethodId,
                userId,
                stripePaymentMethodId: "pm_123",
            });

            mockStripe.paymentMethods.detach.mockResolvedValue({});
            mockDb.paymentMethods.delete.mockResolvedValue({});

            await paymentService.removePaymentMethod(userId, paymentMethodId);

            expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith("pm_123");
            expect(mockDb.paymentMethods.delete).toHaveBeenCalledWith(paymentMethodId, userId);
        });

        it("should throw error if payment method not found", async () => {
            const userId = "user_123";
            const paymentMethodId = "method_123";

            mockDb.paymentMethods.getById.mockResolvedValue(null);

            await expect(
                paymentService.removePaymentMethod(userId, paymentMethodId)
            ).rejects.toThrow("PAYMENT_METHOD_NOT_FOUND");
        });
    });

    describe("createPaymentIntent with saved payment method", () => {
        it("should create payment intent with saved payment method", async () => {
            const params = {
                amount: 6969, // $69.69 in cents
                reservationId: "res_123",
                userId: "user_123",
                idempotencyKey: "key_123",
                paymentMethodId: "pm_123",
                savePaymentMethod: false,
            };

            mockDb.payments.getByIdempotencyKey.mockResolvedValue(null);

            mockDb.users.getById.mockResolvedValue({
                id: params.userId,
                stripeCustomerId: "cus_123",
            });

            mockStripe.paymentIntents.create.mockResolvedValue({
                id: "pi_123",
                client_secret: "secret_123",
            });

            mockDb.payments.create.mockResolvedValue({
                id: "payment_123",
                status: "pending",
            });

            const result = await paymentService.createPaymentIntent(params);

            expect(result).toMatchObject({
                paymentId: "payment_123",
                paymentIntentId: "pi_123",
                clientSecret: "secret_123",
                status: "pending",
            });

            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 6969, // amount already in cents
                    currency: "usd",
                    customer: "cus_123",
                    payment_method: "pm_123",
                    confirm: true,
                    capture_method: "manual",
                }),
                expect.any(Object)
            );
        });

        it("should save payment method when requested", async () => {
            const params = {
                amount: 10000, // $100.00 in cents
                reservationId: "res_123",
                userId: "user_123",
                idempotencyKey: "key_123",
                savePaymentMethod: true,
            };

            mockDb.payments.getByIdempotencyKey.mockResolvedValue(null);

            mockDb.users.getById.mockResolvedValue({
                id: params.userId,
                stripeCustomerId: "cus_123",
            });

            mockStripe.paymentIntents.create.mockResolvedValue({
                id: "pi_123",
                client_secret: "secret_123",
            });

            mockDb.payments.create.mockResolvedValue({
                id: "payment_123",
                status: "pending",
            });

            await paymentService.createPaymentIntent(params);

            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    setup_future_usage: "off_session",
                    customer: "cus_123",
                }),
                expect.any(Object)
            );
        });
    });

    describe("getUserPaymentMethods", () => {
        it("should sync and return user payment methods", async () => {
            const userId = "user_123";

            mockDb.users.getById.mockResolvedValue({
                id: userId,
                stripeCustomerId: "cus_123",
            });

            mockStripe.paymentMethods.list.mockResolvedValue({
                data: [
                    {
                        id: "pm_123",
                        type: "card",
                        card: {
                            last4: "4242",
                            brand: "visa",
                            exp_month: 12,
                            exp_year: 2025,
                        },
                    },
                ],
            });

            mockDb.paymentMethods.getByStripePaymentMethodId.mockResolvedValue(null);

            mockDb.paymentMethods.create.mockResolvedValue({});

            mockDb.paymentMethods.getByUserId.mockResolvedValue([
                {
                    id: "method_123",
                    stripePaymentMethodId: "pm_123",
                    type: "card",
                    last4: "4242",
                    brand: "visa",
                },
            ]);

            const result = await paymentService.getUserPaymentMethods(userId);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                stripePaymentMethodId: "pm_123",
                type: "card",
                last4: "4242",
                brand: "visa",
            });

            expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
                customer: "cus_123",
                type: "card",
            });
        });
    });
});