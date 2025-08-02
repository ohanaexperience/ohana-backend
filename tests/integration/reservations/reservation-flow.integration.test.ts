import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";

import { ReservationService } from "@/reservations/services/reservation";
import { PaymentService } from "@/payments/services/payment";
import { DatabaseFactory } from "@/database";
import { createTestDatabaseConfig } from "../../../helpers/database";
import { generateExperience, generateTimeSlot, generateUser } from "../../../helpers/generators";
import { experiencesTable, experienceTimeSlotsTable, usersTable, reservationsTable, paymentsTable } from "@/database/schemas";
import { eq } from "drizzle-orm";

// Mock Stripe
jest.mock("stripe");

describe("Reservation and Payment Flow Integration Test", () => {
    let db: any;
    let reservationService: ReservationService;
    let paymentService: PaymentService;
    let testUser: any;
    let testExperience: any;
    let testTimeSlot: any;
    let mockStripe: any;

    beforeAll(async () => {
        // Set up test database
        const dbConfig = createTestDatabaseConfig();
        db = DatabaseFactory.create({ postgres: dbConfig });

        // Initialize services
        reservationService = new ReservationService({ database: db });
        paymentService = new PaymentService({ database: db });

        // Set up Stripe mock
        mockStripe = {
            paymentIntents: {
                create: jest.fn().mockResolvedValue({
                    id: "pi_test_123",
                    client_secret: "pi_test_123_secret_456",
                    status: "requires_payment_method",
                }),
                retrieve: jest.fn().mockResolvedValue({
                    id: "pi_test_123",
                    status: "requires_capture",
                    latest_charge: "ch_test_123",
                    payment_method_types: ["card"],
                }),
                capture: jest.fn().mockResolvedValue({
                    id: "pi_test_123",
                    status: "succeeded",
                    latest_charge: "ch_test_123",
                    payment_method_types: ["card"],
                }),
                cancel: jest.fn().mockResolvedValue({
                    id: "pi_test_123",
                    status: "canceled",
                }),
            },
            refunds: {
                create: jest.fn().mockResolvedValue({
                    id: "re_test_123",
                    status: "succeeded",
                }),
            },
        };

        (Stripe as any).mockImplementation(() => mockStripe);
    });

    beforeEach(async () => {
        // Clean up data
        await db.query(`DELETE FROM ${paymentsTable}`);
        await db.query(`DELETE FROM ${reservationsTable}`);
        await db.query(`DELETE FROM ${experienceTimeSlotsTable}`);
        await db.query(`DELETE FROM ${experiencesTable}`);
        await db.query(`DELETE FROM ${usersTable} WHERE email LIKE '%@test.example.com'`);

        // Create test user
        const userData = generateUser();
        const [user] = await db.insert(usersTable).values({
            ...userData,
            email: `test-${Date.now()}@test.example.com`,
        }).returning();
        testUser = user;

        // Create test experience with pricing
        const experienceData = generateExperience(testUser.id);
        const [experience] = await db.insert(experiencesTable).values({
            ...experienceData,
            pricePerPerson: 10000, // $100 per person in cents
            groupDiscountsEnabled: true,
            discountPercentageFor3Plus: 10,
            discountPercentageFor5Plus: 15,
            earlyBirdEnabled: true,
            earlyBirdDiscountPercentage: 20,
            earlyBirdDaysInAdvance: 7,
        }).returning();
        testExperience = experience;

        // Create test time slot (10 days in future for early bird)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);
        
        const timeSlotData = generateTimeSlot(testExperience.id);
        const [timeSlot] = await db.insert(experienceTimeSlotsTable).values({
            ...timeSlotData,
            slotDateTime: futureDate,
            maxCapacity: 20,
            status: "available",
        }).returning();
        testTimeSlot = timeSlot;
    });

    afterAll(async () => {
        // Clean up and close connection
        await db.query(`DELETE FROM ${paymentsTable}`);
        await db.query(`DELETE FROM ${reservationsTable}`);
        await db.query(`DELETE FROM ${experienceTimeSlotsTable}`);
        await db.query(`DELETE FROM ${experiencesTable}`);
        await db.query(`DELETE FROM ${usersTable} WHERE email LIKE '%@test.example.com'`);
    });

    describe("Hold Creation and Conversion Flow", () => {
        it("should create a hold successfully", async () => {
            const holdRequest = {
                authorization: `Bearer ${testUser.id}`, // Simplified for testing
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                guestPhone: "+1234567890",
                specialRequests: "Vegetarian meal",
                idempotencyKey: uuidv4(),
            };

            const result = await reservationService.createHold(holdRequest);

            expect(result.reservation).toBeDefined();
            expect(result.reservation.status).toBe("held");
            expect(result.reservation.numberOfGuests).toBe(2);
            expect(result.reservation.totalPrice).toBe(16000); // $160 after 20% early bird discount
            expect(result.reservation.originalPrice).toBe(20000); // $200 original
            expect(result.reservation.discountApplied).toBe(4000); // $40 discount
            expect(result.reservation.discountType).toBe("early_bird");
            expect(result.holdDurationMinutes).toBe(15);
            expect(result.reservation.holdExpiresAt).toBeDefined();
        });

        it("should apply group discount for 3+ guests", async () => {
            const holdRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 4,
                guestName: "Jane Smith",
                guestEmail: "jane@example.com",
                idempotencyKey: uuidv4(),
            };

            const result = await reservationService.createHold(holdRequest);

            // Original: $400 (4 * $100)
            // Group discount (10%): $40
            // Early bird (20%): $80
            // Total discount: $120
            // Final: $280
            expect(result.reservation.totalPrice).toBe(28000);
            expect(result.reservation.discountApplied).toBe(12000);
            expect(result.reservation.discountType).toContain("group_3_plus");
            expect(result.reservation.discountType).toContain("early_bird");
        });

        it("should handle idempotency correctly", async () => {
            const idempotencyKey = uuidv4();
            const holdRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                idempotencyKey,
            };

            const result1 = await reservationService.createHold(holdRequest);
            const result2 = await reservationService.createHold(holdRequest);

            expect(result2.duplicate).toBe(true);
            expect(result2.reservation.id).toBe(result1.reservation.id);
        });

        it("should convert hold to reservation successfully", async () => {
            // Create hold first
            const holdRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                idempotencyKey: uuidv4(),
            };

            const holdResult = await reservationService.createHold(holdRequest);
            const holdId = holdResult.reservation.id;

            // Convert hold
            const convertResult = await reservationService.convertHoldToReservation(holdId);

            expect(convertResult.reservation).toBeDefined();
            expect(convertResult.reservation.status).toBe("pending");
            expect(convertResult.reservation.paymentIntentId).toBe("pi_test_123");
            expect(convertResult.paymentClientSecret).toBe("pi_test_123_secret_456");

            // Verify Stripe was called
            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 16000, // $160 in cents
                    currency: "usd",
                    capture_method: "manual",
                }),
                expect.any(Object)
            );
        });

        it("should reject conversion of expired hold", async () => {
            // Create hold
            const holdRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                idempotencyKey: uuidv4(),
            };

            const holdResult = await reservationService.createHold(holdRequest);
            
            // Manually expire the hold
            await db.update(reservationsTable)
                .set({ holdExpiresAt: new Date(Date.now() - 1000) })
                .where(eq(reservationsTable.id, holdResult.reservation.id));

            // Try to convert
            await expect(
                reservationService.convertHoldToReservation(holdResult.reservation.id)
            ).rejects.toThrow("HOLD_EXPIRED");
        });

        it("should reject conversion of already converted hold", async () => {
            // Create and convert hold
            const holdRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                idempotencyKey: uuidv4(),
            };

            const holdResult = await reservationService.createHold(holdRequest);
            await reservationService.convertHoldToReservation(holdResult.reservation.id);

            // Try to convert again
            await expect(
                reservationService.convertHoldToReservation(holdResult.reservation.id)
            ).rejects.toThrow("INVALID_HOLD_STATUS");
        });
    });

    describe("Direct Reservation Flow", () => {
        it("should create direct reservation with payment intent", async () => {
            const reservationRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                idempotencyKey: uuidv4(),
            };

            const result = await reservationService.createReservation(reservationRequest);

            expect(result.reservation).toBeDefined();
            expect(result.reservation.status).toBe("pending");
            expect(result.reservation.paymentIntentId).toBe("pi_test_123");
            expect(result.paymentClientSecret).toBe("pi_test_123_secret_456");
        });
    });

    describe("Payment Confirmation Flow", () => {
        it("should confirm reservation after payment", async () => {
            // Create reservation
            const reservationRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                idempotencyKey: uuidv4(),
            };

            const createResult = await reservationService.createReservation(reservationRequest);
            const reservationId = createResult.reservation.id;

            // Mock successful payment authorization
            mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({
                id: "pi_test_123",
                status: "requires_capture",
                latest_charge: "ch_test_123",
                payment_method_types: ["card"],
            });

            // Confirm reservation
            const confirmResult = await reservationService.confirmReservation({
                authorization: `Bearer ${testUser.id}`,
                reservationId,
                paymentIntentId: "pi_test_123",
            });

            expect(confirmResult.reservation.status).toBe("confirmed");
            expect(confirmResult.reservation.paymentStatus).toBe("captured");

            // Verify payment was captured
            expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith("pi_test_123");
        });

        it("should handle payment failure gracefully", async () => {
            // Create reservation
            const reservationRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                idempotencyKey: uuidv4(),
            };

            const createResult = await reservationService.createReservation(reservationRequest);

            // Mock payment failure
            mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({
                id: "pi_test_123",
                status: "requires_payment_method", // Not authorized
            });

            // Try to confirm
            await expect(
                reservationService.confirmReservation({
                    authorization: `Bearer ${testUser.id}`,
                    reservationId: createResult.reservation.id,
                    paymentIntentId: "pi_test_123",
                })
            ).rejects.toThrow("PAYMENT_NOT_AUTHORIZED");
        });
    });

    describe("Capacity Management", () => {
        it("should prevent overbooking", async () => {
            // Update time slot to have limited capacity
            await db.update(experienceTimeSlotsTable)
                .set({ maxCapacity: 5 })
                .where(eq(experienceTimeSlotsTable.id, testTimeSlot.id));

            // Create first reservation for 3 guests
            const reservation1 = await reservationService.createReservation({
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 3,
                guestName: "Guest 1",
                guestEmail: "guest1@example.com",
                idempotencyKey: uuidv4(),
            });

            // Try to create second reservation for 3 guests (would exceed capacity)
            await expect(
                reservationService.createReservation({
                    authorization: `Bearer ${testUser.id}`,
                    experienceId: testExperience.id,
                    timeSlotId: testTimeSlot.id,
                    numberOfGuests: 3,
                    guestName: "Guest 2",
                    guestEmail: "guest2@example.com",
                    idempotencyKey: uuidv4(),
                })
            ).rejects.toThrow("TIME_SLOT_NOT_ENOUGH_CAPACITY");

            // But 2 guests should work
            const reservation2 = await reservationService.createReservation({
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "Guest 2",
                guestEmail: "guest2@example.com",
                idempotencyKey: uuidv4(),
            });

            expect(reservation2.reservation).toBeDefined();
        });

        it("should count held reservations in capacity", async () => {
            // Update time slot to have limited capacity
            await db.update(experienceTimeSlotsTable)
                .set({ maxCapacity: 5 })
                .where(eq(experienceTimeSlotsTable.id, testTimeSlot.id));

            // Create hold for 3 guests
            const hold = await reservationService.createHold({
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 3,
                guestName: "Hold Guest",
                guestEmail: "hold@example.com",
                idempotencyKey: uuidv4(),
            });

            // Try to create reservation for 3 guests (would exceed capacity with hold)
            await expect(
                reservationService.createReservation({
                    authorization: `Bearer ${testUser.id}`,
                    experienceId: testExperience.id,
                    timeSlotId: testTimeSlot.id,
                    numberOfGuests: 3,
                    guestName: "Regular Guest",
                    guestEmail: "regular@example.com",
                    idempotencyKey: uuidv4(),
                })
            ).rejects.toThrow("TIME_SLOT_NOT_ENOUGH_CAPACITY");
        });
    });

    describe("Cancellation and Refund Flow", () => {
        it("should cancel reservation and process refund", async () => {
            // Create and confirm a reservation
            const reservationRequest = {
                authorization: `Bearer ${testUser.id}`,
                experienceId: testExperience.id,
                timeSlotId: testTimeSlot.id,
                numberOfGuests: 2,
                guestName: "John Doe",
                guestEmail: "john@example.com",
                idempotencyKey: uuidv4(),
            };

            const createResult = await reservationService.createReservation(reservationRequest);
            
            // Confirm it
            await reservationService.confirmReservation({
                authorization: `Bearer ${testUser.id}`,
                reservationId: createResult.reservation.id,
                paymentIntentId: "pi_test_123",
            });

            // Cancel with refund
            const cancelResult = await reservationService.cancelReservation({
                authorization: `Bearer ${testUser.id}`,
                reservationId: createResult.reservation.id,
                reason: "Customer requested cancellation",
                refund: true,
            });

            expect(cancelResult.reservation.status).toBe("cancelled");
            expect(cancelResult.refundAmount).toBe(16000); // Full refund
            expect(cancelResult.refundId).toBe("re_test_123");

            // Verify refund was processed
            expect(mockStripe.refunds.create).toHaveBeenCalled();
        });
    });
});