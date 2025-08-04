import { PaymentService } from "@/payments/services/payment";
import { ReservationService } from "@/reservations/services/reservation";
import Stripe from "stripe";

describe("Saved Card Auto-Confirmation Fix", () => {
    let paymentService: PaymentService;
    let reservationService: ReservationService;
    let mockDb: any;
    let mockStripe: any;
    let mockEventService: any;

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
            reservations: {
                getById: jest.fn(),
                update: jest.fn(),
                getByIdempotencyKey: jest.fn(),
            },
            transaction: jest.fn((callback) => callback(mockDb)),
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

        mockEventService = {
            logEvent: jest.fn(),
            logPaymentFailed: jest.fn(),
            logReservationCreated: jest.fn(),
            logPaymentInitiated: jest.fn(),
        };

        // Mock Stripe constructor
        jest.spyOn(Stripe.prototype, "constructor").mockImplementation(function() {
            Object.assign(this, mockStripe);
            return this;
        } as any);

        paymentService = new PaymentService({ database: mockDb });
        (paymentService as any).stripe = mockStripe;

        reservationService = new ReservationService({ database: mockDb });
        (reservationService as any).paymentService = paymentService;
        (reservationService as any).eventService = mockEventService;
    });

    describe("Saved Card Payment Flow", () => {
        it("should auto-confirm payment with saved card (no 3DS)", async () => {
            const mockHold = {
                id: "hold123",
                userId: "user123",
                experienceId: "exp123",
                timeSlotId: "ts123",
                numberOfGuests: 2,
                totalPrice: 10000, // $100.00
                status: "held",
                holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
                idempotencyKey: "key123",
            };

            const mockPaymentMethod = {
                id: "pm_db_123",
                userId: "user123",
                stripePaymentMethodId: "pm_stripe_123",
                status: "active",
            };

            const mockUser = {
                id: "user123",
                stripeCustomerId: "cus_123",
            };

            const mockPaymentIntent = {
                id: "pi_test123",
                status: "succeeded", // Auto-confirmed!
                payment_method: "pm_stripe_123",
                client_secret: "pi_test123_secret",
                latest_charge: "ch_test123",
                payment_method_types: ["card"],
            };

            const mockPayment = {
                id: "payment123",
                paymentIntentId: "pi_test123",
            };

            // Setup mocks
            mockDb.reservations.getById.mockResolvedValue(mockHold);
            mockDb.paymentMethods.getById.mockResolvedValue(mockPaymentMethod);
            mockDb.users.getById.mockResolvedValue(mockUser);
            mockDb.payments.getByIdempotencyKey.mockResolvedValue(null);
            mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
            mockDb.payments.create.mockResolvedValue(mockPayment);
            mockDb.reservations.update.mockResolvedValue(true);

            // Mock getPaymentIntentStatus to return succeeded
            jest.spyOn(paymentService, 'getPaymentIntentStatus').mockResolvedValue({
                status: 'succeeded',
                requiresAction: false,
                paymentMethod: {
                    id: 'pm_stripe_123',
                    types: ['card']
                },
                lastError: null,
                amount: 10000,
                currency: 'usd',
                created: Date.now() / 1000,
                captureMethod: 'manual'
            });

            const result = await reservationService.convertHoldToReservation(
                "hold123",
                undefined,
                "pm_db_123", // Database ID
                false
            );

            // Verify Stripe was called with correct params
            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 10000,
                    currency: "usd",
                    capture_method: "manual",
                    payment_method: "pm_stripe_123", // Stripe ID
                    confirm: true, // Auto-confirm!
                    off_session: true,
                    customer: "cus_123",
                }),
                expect.any(Object)
            );

            // Verify response doesn't include client secret
            expect(result.paymentClientSecret).toBeUndefined();
            expect(result.paymentStatus).toBe("succeeded");
            expect(result.reservation.status).toBe("confirmed");
        });

        it("should return client secret for 3DS required", async () => {
            const mockHold = {
                id: "hold123",
                userId: "user123",
                experienceId: "exp123",
                timeSlotId: "ts123",
                numberOfGuests: 2,
                totalPrice: 10000,
                status: "held",
                holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
                idempotencyKey: "key123",
            };

            const mockPaymentMethod = {
                id: "pm_db_123",
                userId: "user123",
                stripePaymentMethodId: "pm_stripe_3ds",
                status: "active",
            };

            const mockUser = {
                id: "user123",
                stripeCustomerId: "cus_123",
            };

            const mockPaymentIntent = {
                id: "pi_test123",
                status: "requires_action", // 3DS required!
                payment_method: "pm_stripe_3ds",
                client_secret: "pi_test123_secret_3ds",
                payment_method_types: ["card"],
            };

            const mockPayment = {
                id: "payment123",
                paymentIntentId: "pi_test123",
            };

            // Setup mocks
            mockDb.reservations.getById.mockResolvedValue(mockHold);
            mockDb.paymentMethods.getById.mockResolvedValue(mockPaymentMethod);
            mockDb.users.getById.mockResolvedValue(mockUser);
            mockDb.payments.getByIdempotencyKey.mockResolvedValue(null);
            mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
            mockDb.payments.create.mockResolvedValue(mockPayment);
            mockDb.reservations.update.mockResolvedValue(true);

            // Mock getPaymentIntentStatus to return requires_action
            jest.spyOn(paymentService, 'getPaymentIntentStatus').mockResolvedValue({
                status: 'requires_action',
                requiresAction: true,
                paymentMethod: {
                    id: 'pm_stripe_3ds',
                    types: ['card']
                },
                lastError: null,
                amount: 10000,
                currency: 'usd',
                created: Date.now() / 1000,
                captureMethod: 'manual'
            });

            const result = await reservationService.convertHoldToReservation(
                "hold123",
                undefined,
                "pm_db_123",
                false
            );

            // Verify response includes client secret for 3DS
            expect(result.paymentClientSecret).toBe("pi_test123_secret_3ds");
            expect(result.requiresAction).toBe(true);
            expect(result.paymentStatus).toBe("requires_action");
        });

        it("should return client secret for new card payment", async () => {
            const mockHold = {
                id: "hold123",
                userId: "user123",
                experienceId: "exp123",
                timeSlotId: "ts123",
                numberOfGuests: 2,
                totalPrice: 10000,
                status: "held",
                holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
                idempotencyKey: "key123",
            };

            const mockPaymentIntent = {
                id: "pi_test123",
                status: "requires_payment_method", // New card needed
                client_secret: "pi_test123_secret_new",
                payment_method_types: ["card"],
            };

            const mockPayment = {
                id: "payment123",
                paymentIntentId: "pi_test123",
            };

            // Setup mocks
            mockDb.reservations.getById.mockResolvedValue(mockHold);
            mockDb.payments.getByIdempotencyKey.mockResolvedValue(null);
            mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
            mockDb.payments.create.mockResolvedValue(mockPayment);
            mockDb.reservations.update.mockResolvedValue(true);

            // Mock getPaymentIntentStatus to return requires_payment_method
            jest.spyOn(paymentService, 'getPaymentIntentStatus').mockResolvedValue({
                status: 'requires_payment_method',
                requiresAction: false,
                paymentMethod: null,
                lastError: null,
                amount: 10000,
                currency: 'usd',
                created: Date.now() / 1000,
                captureMethod: 'manual'
            });

            const result = await reservationService.convertHoldToReservation(
                "hold123",
                undefined,
                undefined, // No payment method ID
                false
            );

            // Verify Stripe was called without payment method
            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 10000,
                    currency: "usd",
                    capture_method: "manual",
                    automatic_payment_methods: {
                        enabled: true,
                    },
                    // No payment_method or confirm fields
                }),
                expect.any(Object)
            );

            // Verify response includes client secret for new card
            expect(result.paymentClientSecret).toBe("pi_test123_secret_new");
            expect(result.paymentStatus).toBe("requires_payment_method");
        });
    });
});