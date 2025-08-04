import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import { ReservationCleanupService } from "@/reservations/services/cleanup";

describe("ReservationCleanupService", () => {
    let cleanupService: ReservationCleanupService;
    let mockDb: any;
    let mockEventService: any;
    let mockPaymentService: any;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set required environment variables
        process.env = {
            ...originalEnv,
            STRIPE_SECRET_KEY: 'sk_test_mock',
        };

        // Create mock database
        mockDb = {
            instance: {
                select: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
            },
            transaction: jest.fn((callback: any) => callback(mockDb.instance)),
            reservations: {
                update: jest.fn(),
            },
        };

        // Mock event service
        mockEventService = {
            logEvent: jest.fn(),
        };

        // Mock payment service
        mockPaymentService = {
            cancelPayment: jest.fn(),
        };

        cleanupService = new ReservationCleanupService({ database: mockDb });
        
        // Override services
        (cleanupService as any).eventService = mockEventService;
        (cleanupService as any).paymentService = mockPaymentService;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("cleanupFailedPayments", () => {
        it("should clean up orphaned reservations without payment intent", async () => {
            const orphanedReservation = {
                id: "res_123",
                status: "pending",
                paymentIntentId: null,
                createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
                userId: "user_123",
                paymentStatus: "pending",
            };

            mockDb.instance.where.mockResolvedValueOnce([orphanedReservation]);
            mockDb.instance.where.mockResolvedValueOnce([]); // No stale pending reservations

            const result = await cleanupService.cleanupFailedPayments();

            expect(result).toEqual({
                processed: 1,
                cancelled: 1,
                errors: 0,
            });

            expect(mockDb.instance.update).toHaveBeenCalled();
            expect(mockEventService.logEvent).toHaveBeenCalledWith(
                "res_123",
                "cancelled",
                expect.objectContaining({
                    reason: "Payment setup failed",
                    cleanupType: "automatic",
                }),
                expect.any(Object)
            );
        });

        it("should clean up stale pending reservations", async () => {
            const staleReservation = {
                id: "res_456",
                status: "pending",
                paymentIntentId: "pi_123",
                createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
                userId: "user_456",
                paymentStatus: "pending",
            };

            mockDb.instance.where.mockResolvedValueOnce([]); // No orphaned reservations
            mockDb.instance.where.mockResolvedValueOnce([staleReservation]);
            mockPaymentService.cancelPayment.mockResolvedValueOnce(undefined);

            const result = await cleanupService.cleanupFailedPayments();

            expect(result).toEqual({
                processed: 1,
                cancelled: 1,
                errors: 0,
            });

            expect(mockPaymentService.cancelPayment).toHaveBeenCalledWith("pi_123");
        });

        it("should handle errors gracefully", async () => {
            const failingReservation = {
                id: "res_789",
                status: "pending",
                paymentIntentId: null,
                createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
                userId: "user_789",
            };

            mockDb.instance.where.mockResolvedValueOnce([failingReservation]);
            mockDb.instance.where.mockResolvedValueOnce([]);
            mockDb.transaction.mockRejectedValueOnce(new Error("Database error"));

            const result = await cleanupService.cleanupFailedPayments();

            expect(result).toEqual({
                processed: 1,
                cancelled: 0,
                errors: 1,
            });
        });
    });

    describe("cleanupExpiredHolds", () => {
        it("should clean up expired holds", async () => {
            const expiredHold = {
                id: "hold_123",
                status: "held",
                holdExpiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                userId: "user_123",
            };

            mockDb.instance.where.mockResolvedValueOnce([expiredHold]);

            const result = await cleanupService.cleanupExpiredHolds();

            expect(result).toEqual({
                processed: 1,
                released: 1,
                errors: 0,
            });

            expect(mockEventService.logEvent).toHaveBeenCalledWith(
                "hold_123",
                "hold_expired",
                expect.objectContaining({
                    expiredAt: expect.any(Date),
                    holdExpiresAt: expiredHold.holdExpiresAt,
                }),
                expect.objectContaining({
                    source: "system",
                })
            );
        });

        it("should not process non-expired holds", async () => {
            mockDb.instance.where.mockResolvedValueOnce([]);

            const result = await cleanupService.cleanupExpiredHolds();

            expect(result).toEqual({
                processed: 0,
                released: 0,
                errors: 0,
            });
        });
    });

    describe("runAllCleanupTasks", () => {
        it("should run all cleanup tasks", async () => {
            // Mock successful cleanup results
            mockDb.instance.where.mockResolvedValue([]);

            const result = await cleanupService.runAllCleanupTasks();

            expect(result).toHaveProperty("failedPayments");
            expect(result).toHaveProperty("expiredHolds");
            expect(result.failedPayments).toEqual({
                processed: 0,
                cancelled: 0,
                errors: 0,
            });
            expect(result.expiredHolds).toEqual({
                processed: 0,
                released: 0,
                errors: 0,
            });
        });
    });
});