import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { timeSlotsLockingQueryManager } from "@/database/postgres/query_managers/time_slots_locking";

describe("Time Slot Locking - Race Condition Prevention", () => {
    let mockTx: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock transaction object
        mockTx = {
            execute: jest.fn(),
        };
    });

    describe("getByIdWithLockAndBookedCount", () => {
        it("should use SELECT FOR UPDATE to lock the row", async () => {
            const mockTimeSlot = {
                id: "slot_123",
                experience_id: "exp_123",
                availability_id: "avail_123",
                slot_datetime: new Date(),
                local_date: new Date(),
                local_time: "10:00",
                max_capacity: 10,
                booked_count: 0,
                status: "available",
                created_at: new Date(),
                updated_at: new Date(),
            };

            // Mock the SQL queries
            mockTx.execute
                .mockResolvedValueOnce({ rows: [mockTimeSlot] }) // Time slot query
                .mockResolvedValueOnce({ rows: [{ total_guests: 3 }] }); // Booking count query

            const result = await timeSlotsLockingQueryManager.getByIdWithLockAndBookedCount(
                mockTx,
                "slot_123",
                false
            );

            // Verify SELECT FOR UPDATE was used
            expect(mockTx.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    strings: expect.arrayContaining(['FOR UPDATE']),
                })
            );
            
            expect(result).toEqual({
                ...mockTimeSlot,
                bookedCount: 3,
            });
        });

        it("should return null if time slot not found", async () => {
            mockTx.execute.mockResolvedValueOnce({ rows: [] });

            const result = await timeSlotsLockingQueryManager.getByIdWithLockAndBookedCount(
                mockTx,
                "non_existent",
                false
            );

            expect(result).toBeNull();
        });
    });

    describe("checkAndReserveCapacity", () => {
        it("should successfully reserve capacity when available", async () => {
            const mockTimeSlot = {
                id: "slot_123",
                status: "available",
                maxCapacity: 10,
            };

            // Mock the locking query
            mockTx.for.mockResolvedValueOnce([mockTimeSlot]);
            mockTx.where.mockResolvedValueOnce([{ totalGuests: 3 }]);

            const result = await timeSlotsLockingQueryManager.checkAndReserveCapacity(
                mockTx,
                "slot_123",
                5, // Requesting 5 guests
                false
            );

            expect(result).toEqual({
                success: true,
                timeSlot: {
                    ...mockTimeSlot,
                    bookedCount: 3,
                },
            });
        });

        it("should fail when not enough capacity", async () => {
            const mockTimeSlot = {
                id: "slot_123",
                status: "available",
                maxCapacity: 10,
            };

            // Mock the locking query
            mockTx.for.mockResolvedValueOnce([mockTimeSlot]);
            mockTx.where.mockResolvedValueOnce([{ totalGuests: 8 }]); // 8 already booked

            const result = await timeSlotsLockingQueryManager.checkAndReserveCapacity(
                mockTx,
                "slot_123",
                5, // Requesting 5 guests (8 + 5 > 10)
                false
            );

            expect(result).toEqual({
                success: false,
                timeSlot: {
                    ...mockTimeSlot,
                    bookedCount: 8,
                },
                reason: 'NOT_ENOUGH_CAPACITY',
            });
        });

        it("should fail when time slot is not available", async () => {
            const mockTimeSlot = {
                id: "slot_123",
                status: "unavailable",
                maxCapacity: 10,
            };

            // Mock the locking query
            mockTx.for.mockResolvedValueOnce([mockTimeSlot]);
            mockTx.where.mockResolvedValueOnce([{ totalGuests: 0 }]);

            const result = await timeSlotsLockingQueryManager.checkAndReserveCapacity(
                mockTx,
                "slot_123",
                5,
                false
            );

            expect(result).toEqual({
                success: false,
                timeSlot: {
                    ...mockTimeSlot,
                    bookedCount: 0,
                },
                reason: 'TIME_SLOT_NOT_AVAILABLE',
            });
        });

        it("should include held reservations when requested", async () => {
            const mockTimeSlot = {
                id: "slot_123",
                status: "available",
                maxCapacity: 10,
            };

            // Mock the locking query
            mockTx.for.mockResolvedValueOnce([mockTimeSlot]);
            mockTx.where.mockResolvedValueOnce([{ totalGuests: 7 }]); // Including held

            const result = await timeSlotsLockingQueryManager.checkAndReserveCapacity(
                mockTx,
                "slot_123",
                3,
                true // Include held reservations
            );

            expect(result).toEqual({
                success: true,
                timeSlot: {
                    ...mockTimeSlot,
                    bookedCount: 7,
                },
            });
        });
    });

    describe("Race Condition Scenario", () => {
        it("should prevent double booking through row locking", async () => {
            // This test simulates what happens at the database level
            // In a real scenario, the second transaction would wait for the first to complete
            
            const mockTimeSlot = {
                id: "slot_123",
                status: "available",
                maxCapacity: 10,
            };

            // First request locks the row and sees 8 guests booked
            mockTx.for.mockResolvedValueOnce([mockTimeSlot]);
            mockTx.where.mockResolvedValueOnce([{ totalGuests: 8 }]);

            const result1 = await timeSlotsLockingQueryManager.checkAndReserveCapacity(
                mockTx,
                "slot_123",
                2, // Can book 2 more
                false
            );

            expect(result1.success).toBe(true);

            // In a real database, the second request would wait for the lock
            // and then see the updated count (10 guests)
            // Here we simulate that by returning the updated count
            mockTx.for.mockResolvedValueOnce([mockTimeSlot]);
            mockTx.where.mockResolvedValueOnce([{ totalGuests: 10 }]); // Now full

            const result2 = await timeSlotsLockingQueryManager.checkAndReserveCapacity(
                mockTx,
                "slot_123",
                1, // Try to book 1 more
                false
            );

            expect(result2.success).toBe(false);
            expect(result2.reason).toBe('NOT_ENOUGH_CAPACITY');
        });
    });
});