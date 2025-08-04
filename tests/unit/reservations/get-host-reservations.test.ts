import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ReservationService } from "@/reservations/services/reservation";
import ERRORS from "@/errors";

// Mock dependencies
jest.mock("@/database/postgres");
jest.mock("@/payments/services/payment");
jest.mock("@/reservations/services/event");

describe("ReservationService - Get Host Reservations", () => {
    let reservationService: ReservationService;
    let mockDb: any;

    beforeEach(() => {
        // Setup mock database
        mockDb = {
            transaction: jest.fn((callback) => callback(mockDb)),
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            offset: jest.fn().mockReturnThis(),
        };

        reservationService = new ReservationService({ database: mockDb });
    });

    describe("getHostReservations", () => {
        const mockHostId = "host-123";
        const mockExperienceId = "exp-456";
        
        const mockExperience = {
            id: mockExperienceId,
            hostId: mockHostId,
            title: "Test Experience",
        };

        const mockReservations = [
            {
                reservation: {
                    id: "res-1",
                    status: "confirmed",
                    reservationReference: "REF123",
                    numberOfGuests: 2,
                    totalPrice: 10000,
                    specialRequests: "Vegetarian meal",
                    paymentStatus: "paid",
                    createdAt: new Date("2024-01-01"),
                    guestName: "John Doe",
                    guestEmail: "john@example.com",
                    guestPhone: "+1234567890",
                },
                experience: {
                    id: mockExperienceId,
                    title: "Test Experience",
                    coverImage: "image.jpg",
                },
                timeSlot: {
                    id: "slot-1",
                    slotDateTime: new Date("2024-02-01T10:00:00Z"),
                    localDate: "2024-02-01",
                    localTime: "10:00",
                },
                user: {
                    id: "user-1",
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    profileImage: "profile.jpg",
                },
            },
        ];

        it("should get all reservations for host's experiences", async () => {
            // Mock experience ownership check
            mockDb.limit.mockResolvedValueOnce([{ id: mockExperienceId }]);
            
            // Mock count query
            mockDb.where.mockResolvedValueOnce([{ count: 1 }]);
            
            // Mock reservations query
            mockDb.offset.mockResolvedValueOnce(mockReservations);

            const result = await reservationService.getHostReservations(mockHostId, {});

            expect(result.reservations).toHaveLength(1);
            expect(result.reservations[0].id).toBe("res-1");
            expect(result.reservations[0].status).toBe("confirmed");
            expect(result.total).toBe(1);
        });

        it("should filter by specific experience ID", async () => {
            // Mock experience ownership verification
            mockDb.limit.mockResolvedValueOnce([mockExperience]);
            
            // Mock count query
            mockDb.where.mockResolvedValueOnce([{ count: 1 }]);
            
            // Mock reservations query
            mockDb.offset.mockResolvedValueOnce(mockReservations);

            const result = await reservationService.getHostReservations(mockHostId, {
                experienceId: mockExperienceId,
            });

            expect(result.reservations).toHaveLength(1);
            expect(mockDb.where).toHaveBeenCalled();
        });

        it("should throw error if host doesn't own the experience", async () => {
            // Mock no experience found (host doesn't own it)
            mockDb.limit.mockResolvedValueOnce([]);

            await expect(
                reservationService.getHostReservations(mockHostId, {
                    experienceId: "wrong-exp-id",
                })
            ).rejects.toThrow(ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE);
        });

        it("should filter by reservation status", async () => {
            // Mock experience ownership check
            mockDb.limit.mockResolvedValueOnce([{ id: mockExperienceId }]);
            
            // Mock count query
            mockDb.where.mockResolvedValueOnce([{ count: 1 }]);
            
            // Mock reservations query
            mockDb.offset.mockResolvedValueOnce(mockReservations);

            const result = await reservationService.getHostReservations(mockHostId, {
                status: "confirmed",
            });

            expect(result.reservations).toHaveLength(1);
            expect(result.reservations[0].status).toBe("confirmed");
        });

        it("should filter by date range", async () => {
            // Mock experience ownership check
            mockDb.limit.mockResolvedValueOnce([{ id: mockExperienceId }]);
            
            // Mock count query  
            mockDb.where.mockResolvedValueOnce([{ count: 1 }]);
            
            // Mock reservations query
            mockDb.offset.mockResolvedValueOnce(mockReservations);

            const result = await reservationService.getHostReservations(mockHostId, {
                fromDate: "2024-01-01T00:00:00Z",
                toDate: "2024-12-31T23:59:59Z",
            });

            expect(result.reservations).toHaveLength(1);
            expect(mockDb.where).toHaveBeenCalled();
        });

        it("should handle pagination", async () => {
            // Mock experience ownership check
            mockDb.limit.mockResolvedValueOnce([{ id: mockExperienceId }]);
            
            // Mock count query
            mockDb.where.mockResolvedValueOnce([{ count: 50 }]);
            
            // Mock reservations query
            mockDb.offset.mockResolvedValueOnce(mockReservations);

            const result = await reservationService.getHostReservations(mockHostId, {
                limit: 10,
                offset: 20,
            });

            expect(mockDb.limit).toHaveBeenCalledWith(10);
            expect(mockDb.offset).toHaveBeenCalledWith(20);
            expect(result.total).toBe(50);
        });

        it("should return empty array if host has no experiences", async () => {
            // Mock no experiences for host
            mockDb.limit.mockResolvedValueOnce([]);

            const result = await reservationService.getHostReservations(mockHostId, {});

            expect(result.reservations).toEqual([]);
            expect(result.total).toBe(0);
        });

        it("should handle guests without user accounts", async () => {
            const reservationWithoutUser = [{
                ...mockReservations[0],
                user: null,
            }];

            // Mock experience ownership check
            mockDb.limit.mockResolvedValueOnce([{ id: mockExperienceId }]);
            
            // Mock count query
            mockDb.where.mockResolvedValueOnce([{ count: 1 }]);
            
            // Mock reservations query
            mockDb.offset.mockResolvedValueOnce(reservationWithoutUser);

            const result = await reservationService.getHostReservations(mockHostId, {});

            expect(result.reservations[0].guest).toHaveProperty("name");
            expect(result.reservations[0].guest).toHaveProperty("email");
            expect(result.reservations[0].guest).not.toHaveProperty("id");
        });

        it("should order reservations by time slot date descending", async () => {
            const multipleReservations = [
                {
                    ...mockReservations[0],
                    reservation: { ...mockReservations[0].reservation, id: "res-2" },
                    timeSlot: {
                        ...mockReservations[0].timeSlot,
                        slotDateTime: new Date("2024-03-01T10:00:00Z"),
                    },
                },
                mockReservations[0],
            ];

            // Mock experience ownership check
            mockDb.limit.mockResolvedValueOnce([{ id: mockExperienceId }]);
            
            // Mock count query
            mockDb.where.mockResolvedValueOnce([{ count: 2 }]);
            
            // Mock reservations query
            mockDb.offset.mockResolvedValueOnce(multipleReservations);

            const result = await reservationService.getHostReservations(mockHostId, {});

            expect(mockDb.orderBy).toHaveBeenCalled();
            expect(result.reservations).toHaveLength(2);
        });
    });
});