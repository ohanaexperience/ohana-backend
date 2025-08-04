import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import Stripe from "stripe";
import { WebhookService } from "@/webhooks/services/webhook";

describe("Webhook Deduplication", () => {
    let webhookService: WebhookService;
    let mockStripeClient: any;
    let mockPaymentService: any;
    let mockDb: any;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set required environment variables
        process.env = {
            ...originalEnv,
            STRIPE_SECRET_KEY: 'sk_test_mock',
        };

        mockStripeClient = {
            webhooks: {
                constructEvent: jest.fn(),
            },
        };

        mockPaymentService = {
            handleWebhook: jest.fn(),
        };

        // Create mock database with webhook events query manager
        mockDb = {
            webhookEvents: {
                getByStripeEventId: jest.fn(),
                create: jest.fn(),
                updateProcessingDuration: jest.fn(),
                recordError: jest.fn(),
            },
            hostVerifications: {
                update: jest.fn(),
            },
            hosts: {
                create: jest.fn(),
            },
        };

        webhookService = new WebhookService({
            database: mockDb as any,
            stripeClient: mockStripeClient,
            stripeWebhookSecret: "test_secret",
        });

        // Override the payment service
        (webhookService as any).paymentService = mockPaymentService;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("Payment Webhook Deduplication", () => {
        const mockWebhookData: any = {
            headers: { "stripe-signature": "test_signature" },
            body: "test_body",
        };

        const mockStripeEvent = {
            id: "evt_123",
            type: "payment_intent.succeeded",
            data: { object: { id: "pi_123" } },
            api_version: "2025-04-30",
        };

        it("should process new webhook events", async () => {
            mockStripeClient.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
            mockDb.webhookEvents.getByStripeEventId.mockResolvedValue(null);
            mockDb.webhookEvents.create.mockResolvedValue({ id: "webhook_123" });
            mockPaymentService.handleWebhook.mockResolvedValue(undefined);

            const result = await webhookService.handlePaymentWebhook(mockWebhookData);

            expect(mockDb.webhookEvents.getByStripeEventId).toHaveBeenCalledWith("evt_123");
            expect(mockDb.webhookEvents.create).toHaveBeenCalledWith({
                stripeEventId: "evt_123",
                eventType: "payment_intent.succeeded",
                eventData: mockStripeEvent.data,
                webhookEndpoint: "payment",
                apiVersion: "2025-04-30",
            });
            expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(mockStripeEvent);
            expect(result).toEqual({ received: true });
        });

        it("should skip duplicate webhook events", async () => {
            mockStripeClient.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
            mockDb.webhookEvents.getByStripeEventId.mockResolvedValue({
                id: "webhook_123",
                stripeEventId: "evt_123",
                processedAt: new Date(),
            });

            const result = await webhookService.handlePaymentWebhook(mockWebhookData);

            expect(mockDb.webhookEvents.getByStripeEventId).toHaveBeenCalledWith("evt_123");
            expect(mockDb.webhookEvents.create).not.toHaveBeenCalled();
            expect(mockPaymentService.handleWebhook).not.toHaveBeenCalled();
            expect(result).toEqual({ received: true, duplicate: true });
        });

        it("should record errors when webhook processing fails", async () => {
            const error = new Error("Payment processing failed");
            mockStripeClient.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
            mockDb.webhookEvents.getByStripeEventId.mockResolvedValue(null);
            mockDb.webhookEvents.create.mockResolvedValue({ id: "webhook_123" });
            mockPaymentService.handleWebhook.mockRejectedValue(error);

            await expect(webhookService.handlePaymentWebhook(mockWebhookData)).rejects.toThrow(error);

            expect(mockDb.webhookEvents.recordError).toHaveBeenCalledWith("evt_123", {
                errorMessage: "Payment processing failed",
                errorCode: undefined,
            });
        });

        it("should update processing duration for successful webhooks", async () => {
            mockStripeClient.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
            mockDb.webhookEvents.getByStripeEventId.mockResolvedValue(null);
            mockDb.webhookEvents.create.mockResolvedValue({ id: "webhook_123" });
            mockPaymentService.handleWebhook.mockResolvedValue(undefined);

            await webhookService.handlePaymentWebhook(mockWebhookData);

            expect(mockDb.webhookEvents.updateProcessingDuration).toHaveBeenCalledWith(
                "evt_123",
                expect.any(Number)
            );
        });
    });

    describe("Identity Webhook Deduplication", () => {
        const mockWebhookData: any = {
            headers: { "stripe-signature": "test_signature" },
            body: "test_body",
        };

        const mockStripeEvent = {
            id: "evt_456",
            type: "identity.verification_session.verified",
            data: {
                object: {
                    id: "vs_123",
                    metadata: { user_id: "user_123" },
                },
            },
            api_version: "2025-04-30",
        };

        beforeEach(() => {
            // Host verification and hosts are already mocked in the parent beforeEach
        });

        it("should process new identity webhook events", async () => {
            mockStripeClient.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
            mockDb.webhookEvents.getByStripeEventId.mockResolvedValue(null);
            mockDb.webhookEvents.create.mockResolvedValue({ id: "webhook_456" });

            const result = await webhookService.handleIdentityWebhook(mockWebhookData);

            expect(mockDb.webhookEvents.getByStripeEventId).toHaveBeenCalledWith("evt_456");
            expect(mockDb.webhookEvents.create).toHaveBeenCalledWith({
                stripeEventId: "evt_456",
                eventType: "identity.verification_session.verified",
                eventData: mockStripeEvent.data,
                webhookEndpoint: "identity",
                apiVersion: "2025-04-30",
            });
            expect(mockDb.hostVerifications.update).toHaveBeenCalled();
            expect(mockDb.hosts.create).toHaveBeenCalled();
            expect(result).toEqual({ received: true });
        });

        it("should skip duplicate identity webhook events", async () => {
            mockStripeClient.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
            mockDb.webhookEvents.getByStripeEventId.mockResolvedValue({
                id: "webhook_456",
                stripeEventId: "evt_456",
                processedAt: new Date(),
            });

            const result = await webhookService.handleIdentityWebhook(mockWebhookData);

            expect(mockDb.webhookEvents.getByStripeEventId).toHaveBeenCalledWith("evt_456");
            expect(mockDb.webhookEvents.create).not.toHaveBeenCalled();
            expect(mockDb.hostVerifications.update).not.toHaveBeenCalled();
            expect(mockDb.hosts.create).not.toHaveBeenCalled();
            expect(result).toEqual({ received: true, duplicate: true });
        });
    });
});