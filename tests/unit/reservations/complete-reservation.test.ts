import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ReservationService } from "@/reservations/services/reservation";
import { ReservationEventService } from "@/reservations/services/event";
import ERRORS from "@/errors";

// Mock dependencies
jest.mock("@/database/postgres");
jest.mock("@/payments/services/payment");
jest.mock("@/reservations/services/event");

describe("ReservationService - Complete Reservation", () => {
    let reservationService: ReservationService;
    let mockDb: any;
    let mockEventService: any;

    beforeEach(() => {
        // Setup mock database
        mockDb = {
            transaction: jest.fn((callback) => callback(mockDb)),
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            reservations: {
                getById: jest.fn(),
                update: jest.fn(),
            },
        };

        // Setup mock event service
        mockEventService = {
            logEvent: jest.fn().mockResolvedValue(undefined),
        };

        // Mock the event service constructor
        (ReservationEventService as jest.Mock).mockImplementation(() => mockEventService);

        reservationService = new ReservationService({ database: mockDb });
    });

    describe("completeReservation", () => {
        const mockReservationId = "res-123";
        const mockHostId = "host-456";
        const mockGuestId = "guest-789";

        const mockReservation = {
            reservation: {
                id: mockReservationId,
                userId: mockGuestId,
                status: "confirmed",
                numberOfGuests: 4,
            },
            experience: {
                id: "exp-123",
                hostId: mockHostId,
            },
            timeSlot: {
                id: "slot-123",
                slotDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            },
        };

        it("should successfully complete a reservation", async () => {
            // Setup mock responses
            mockDb.limit.mockResolvedValue([mockReservation]);
            mockDb.returning.mockResolvedValue([
                { ...mockReservation.reservation, status: "completed" },
            ]);

            const completionData = {
                actualAttendance: 3,
                hostNotes: "Great group!",
                noShow: false,
            };

            const result = await reservationService.completeReservation(
                mockReservationId,
                mockHostId,
                completionData
            );

            // Verify the reservation was updated
            expect(mockDb.update).toHaveBeenCalledWith(expect.anything());
            expect(mockDb.set).toHaveBeenCalledWith({
                status: "completed",
                updatedAt: expect.any(Date),
            });

            // Verify completion event was logged
            expect(mockEventService.logEvent).toHaveBeenCalledWith(
                mockReservationId,
                "reservation_completed",
                expect.objectContaining({
                    completedAt: expect.any(Date),
                    completedBy: "host",
                    hostId: mockHostId,
                    actualAttendance: 3,
                    noShow: false,
                    hostNotes: "Great group!",
                    originalGuests: 4,
                }),
                expect.any(Object)
            );

            expect(result.status).toBe("completed");
        });

        it("should log incident report when provided", async () => {
            // Setup mock responses
            mockDb.limit.mockResolvedValue([mockReservation]);
            mockDb.returning.mockResolvedValue([
                { ...mockReservation.reservation, status: "completed" },
            ]);

            const completionData = {
                actualAttendance: 4,
                incidentReport: "Guest was disruptive",
            };

            await reservationService.completeReservation(
                mockReservationId,
                mockHostId,
                completionData
            );

            // Verify incident report was logged
            expect(mockEventService.logEvent).toHaveBeenCalledWith(
                mockReservationId,
                "incident_reported",
                expect.objectContaining({
                    reportedAt: expect.any(Date),
                    reportedBy: "host",
                    hostId: mockHostId,
                    incidentDetails: "Guest was disruptive",
                }),
                expect.any(Object)
            );
        });

        it("should throw error if reservation not found", async () => {
            mockDb.limit.mockResolvedValue([]);

            await expect(
                reservationService.completeReservation(
                    mockReservationId,
                    mockHostId,
                    {}
                )
            ).rejects.toThrow(ERRORS.RESERVATIONS.NOT_FOUND.CODE);
        });

        it("should throw error if host does not own the experience", async () => {
            const wrongHostReservation = {
                ...mockReservation,
                experience: {
                    ...mockReservation.experience,
                    hostId: "different-host",
                },
            };

            mockDb.limit.mockResolvedValue([wrongHostReservation]);

            await expect(
                reservationService.completeReservation(
                    mockReservationId,
                    mockHostId,
                    {}
                )
            ).rejects.toThrow(ERRORS.RESERVATIONS.FORBIDDEN_COMPLETE.CODE);
        });

        it("should throw error if reservation is not confirmed", async () => {
            const pendingReservation = {
                ...mockReservation,
                reservation: {
                    ...mockReservation.reservation,
                    status: "pending",
                },
            };

            mockDb.limit.mockResolvedValue([pendingReservation]);

            await expect(
                reservationService.completeReservation(
                    mockReservationId,
                    mockHostId,
                    {}
                )
            ).rejects.toThrow(ERRORS.RESERVATIONS.INVALID_STATUS_TRANSITION.CODE);
        });

        it("should throw error if experience has not started yet", async () => {
            const futureReservation = {
                ...mockReservation,
                timeSlot: {
                    ...mockReservation.timeSlot,
                    slotDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours in future
                },
            };

            mockDb.limit.mockResolvedValue([futureReservation]);

            await expect(
                reservationService.completeReservation(
                    mockReservationId,
                    mockHostId,
                    {}
                )
            ).rejects.toThrow(ERRORS.RESERVATIONS.EXPERIENCE_NOT_STARTED.CODE);
        });

        it("should allow completion 1 hour before experience time", async () => {
            const soonReservation = {
                ...mockReservation,
                timeSlot: {
                    ...mockReservation.timeSlot,
                    slotDateTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes in future
                },
            };

            mockDb.limit.mockResolvedValue([soonReservation]);
            mockDb.returning.mockResolvedValue([
                { ...soonReservation.reservation, status: "completed" },
            ]);

            const result = await reservationService.completeReservation(
                mockReservationId,
                mockHostId,
                {}
            );

            expect(result.status).toBe("completed");
        });

        it("should handle no-show scenarios", async () => {
            mockDb.limit.mockResolvedValue([mockReservation]);
            mockDb.returning.mockResolvedValue([
                { ...mockReservation.reservation, status: "completed" },
            ]);

            const completionData = {
                actualAttendance: 0,
                noShow: true,
                hostNotes: "Guests did not show up",
            };

            await reservationService.completeReservation(
                mockReservationId,
                mockHostId,
                completionData
            );

            expect(mockEventService.logEvent).toHaveBeenCalledWith(
                mockReservationId,
                "reservation_completed",
                expect.objectContaining({
                    actualAttendance: 0,
                    noShow: true,
                    hostNotes: "Guests did not show up",
                }),
                expect.any(Object)
            );
        });
    });
});