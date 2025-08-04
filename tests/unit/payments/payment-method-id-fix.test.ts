import { PaymentService } from "@/payments/services/payment";
import Stripe from "stripe";

describe("Payment Method ID Fix", () => {
    let paymentService: PaymentService;
    let mockDb: any;
    let mockStripe: any;

    beforeEach(() => {
        // Set test Stripe key
        process.env.STRIPE_SECRET_KEY = "sk_test_mock";
        mockDb = {
            payments: {
                getByIdempotencyKey: jest.fn(),
                create: jest.fn(),
                getByPaymentIntentId: jest.fn(),
                updateStatus: jest.fn(),
                getById: jest.fn(),
            },
            users: {
                getById: jest.fn(),
                update: jest.fn(),
            },
            paymentMethods: {
                getById: jest.fn(),
                getByUserId: jest.fn(),
            },
        };

        mockStripe = {
            paymentIntents: {
                create: jest.fn(),
                update: jest.fn(),
                retrieve: jest.fn(),
            },
            customers: {
                create: jest.fn(),
            },
        };

        // Mock Stripe constructor
        jest.spyOn(Stripe.prototype, "constructor").mockImplementation(function() {
            Object.assign(this, mockStripe);
            return this;
        } as any);

        paymentService = new PaymentService({ database: mockDb });
        (paymentService as any).stripe = mockStripe;
    });

    describe("updatePaymentIntent", () => {
        it("should update payment intent with Stripe payment method ID", async () => {
            const mockPaymentIntent = {
                id: "pi_test123",
                status: "succeeded",
                latest_charge: "ch_test123",
                payment_method_types: ["card"],
            };

            const mockPayment = {
                id: "payment123",
                paymentIntentId: "pi_test123",
            };

            mockStripe.paymentIntents.update.mockResolvedValue(mockPaymentIntent);
            mockDb.payments.getByPaymentIntentId.mockResolvedValue(mockPayment);

            const result = await paymentService.updatePaymentIntent("pi_test123", {
                payment_method: "pm_test456",
                confirm: true,
            });

            expect(mockStripe.paymentIntents.update).toHaveBeenCalledWith("pi_test123", {
                payment_method: "pm_test456",
                confirm: true,
            });
            expect(result).toEqual(mockPaymentIntent);
        });

        it("should handle card declined errors properly", async () => {
            const error = new Error("Card declined");
            (error as any).type = "StripeCardError";
            mockStripe.paymentIntents.update.mockRejectedValue(error);

            await expect(
                paymentService.updatePaymentIntent("pi_test123", {
                    payment_method: "pm_test456",
                })
            ).rejects.toThrow("PAYMENT_CARD_DECLINED");
        });
    });

    describe("createPaymentIntent with saved payment method", () => {
        it("should use Stripe payment method ID when provided", async () => {
            const mockPaymentIntent = {
                id: "pi_test123",
                client_secret: "pi_test123_secret",
                status: "requires_confirmation",
            };

            const mockPayment = {
                id: "payment123",
            };

            mockDb.payments.getByIdempotencyKey.mockResolvedValue(null);
            mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
            mockDb.payments.create.mockResolvedValue(mockPayment);

            const result = await paymentService.createPaymentIntent({
                amount: 5000,
                reservationId: "res123",
                userId: "user123",
                idempotencyKey: "key123",
                paymentMethodId: "pm_stripe123", // Stripe payment method ID
            });

            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 5000,
                    currency: "usd",
                    capture_method: "manual",
                    payment_method: "pm_stripe123",
                    confirm: true,
                    off_session: true,
                }),
                expect.any(Object)
            );

            expect(result.paymentId).toBe("payment123");
        });
    });
});