import crypto from "crypto";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";

import { CreateReservationRequest } from "../validations";
import { ReservationServiceOptions } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";
import { experiencesTable, reservationsTable } from "@/database/schemas";
import { PaymentService } from "@/payments/services/payment";
import { ReservationEventService } from "./event";

// Types for discount calculations
interface DiscountResult {
    amount: number;
    type: string | null;
}

interface Experience {
    pricePerPerson: number;
    groupDiscountsEnabled: boolean | null;
    discountPercentageFor3Plus?: number | null;
    discountPercentageFor5Plus?: number | null;
    earlyBirdEnabled: boolean | null;
    earlyBirdDiscountPercentage?: number | null;
    earlyBirdDaysInAdvance?: number | null;
}

interface TimeSlot {
    id: string;
    slotDateTime: Date;
    bookedCount: number;
    maxCapacity: number;
    status: string | null;
}

export class ReservationService {
    private readonly db: Postgres;
    private readonly paymentService: PaymentService;
    private readonly eventService: ReservationEventService;

    constructor({ database }: ReservationServiceOptions) {
        this.db = database;
        this.paymentService = new PaymentService({ database });
        this.eventService = new ReservationEventService(database);
    }

    async createHold(request: CreateReservationRequest) {
        const { 
            authorization, 
            experienceId, 
            timeSlotId, 
            numberOfGuests,
            guestName,
            guestEmail,
            guestPhone,
            specialRequests,
            idempotencyKey
        } = request;

        const { sub: userId } = decodeToken(authorization);
        const HOLD_DURATION_MINUTES = 15; // 15 minute hold

        // Check for existing reservation with same idempotency key
        const existingReservation = await this.db.reservations.getByIdempotencyKey(idempotencyKey);
        if (existingReservation) {
            // Check if it's a hold that has expired
            if (existingReservation.status === 'held' && 
                existingReservation.holdExpiresAt && 
                new Date() > existingReservation.holdExpiresAt) {
                
                // Hold has expired - cancel it and create a new one
                await this.db.transaction(async (tx) => {
                    await tx
                        .update(reservationsTable)
                        .set({
                            status: 'cancelled',
                            cancelledAt: new Date(),
                            cancellationReason: 'Hold expired - replaced by new hold',
                            updatedAt: new Date(),
                        })
                        .where(eq(reservationsTable.id, existingReservation.id));

                    // Log the expiration event
                    await this.eventService.logEvent(
                        existingReservation.id,
                        'hold_expired',
                        {
                            expiredAt: new Date(),
                            replacedWithNewHold: true,
                        },
                        {
                            userId,
                            source: 'api',
                            metadata: {
                                reason: 'Expired hold replaced on duplicate request',
                            },
                        }
                    );
                });
                
                // Continue to create a new hold (don't return here)
            } else {
                // Existing reservation is still valid, return it
                return {
                    reservation: existingReservation,
                    duplicate: true,
                };
            }
        }

        // Use transaction to ensure atomicity
        return await this.db.transaction(async (tx) => {
            // Get time slot with calculated booked count (including held reservations)
            const timeSlot = await this.db.timeSlots.getByIdWithBookedCount(timeSlotId, true);

            if (!timeSlot) {
                throw new Error(ERRORS.TIME_SLOT.NOT_FOUND.CODE);
            }

            if (timeSlot.status !== "available") {
                throw new Error(ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE);
            }

            // Check capacity including held reservations
            if (timeSlot.bookedCount + numberOfGuests > timeSlot.maxCapacity) {
                throw new Error(ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.CODE);
            }

            const experienceResults = await tx
                .select()
                .from(experiencesTable)
                .where(eq(experiencesTable.id, experienceId));
            
            const experience = experienceResults[0] || null;

            if (!experience) {
                throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
            }

            const basePrice = experience.pricePerPerson * numberOfGuests;

            // Calculate discounts
            const groupDiscount = this.calculateGroupDiscount(
                experience,
                numberOfGuests,
                basePrice
            );
            const earlyBirdDiscount = this.calculateEarlyBirdDiscount(
                experience,
                timeSlot,
                basePrice
            );

            const totalDiscountAmount = groupDiscount.amount + earlyBirdDiscount.amount;
            let discountType = null;
            if (groupDiscount.type && earlyBirdDiscount.type) {
                discountType = `${groupDiscount.type},${earlyBirdDiscount.type}`;
            } else if (groupDiscount.type) {
                discountType = groupDiscount.type;
            } else if (earlyBirdDiscount.type) {
                discountType = earlyBirdDiscount.type;
            }

            const totalPrice = basePrice - totalDiscountAmount;
            const reservationReference = this.generateReservationReference();
            const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);

            // Create reservation with held status
            const [reservation] = await tx
                .insert(reservationsTable)
                .values({
                    userId,
                    experienceId,
                    timeSlotId,
                    numberOfGuests,
                    totalPrice,
                    originalPrice: basePrice,
                    discountApplied: totalDiscountAmount,
                    discountType,
                    reservationReference,
                    guestName,
                    guestEmail,
                    guestPhone,
                    specialRequests,
                    paymentStatus: "pending",
                    status: "held",
                    idempotencyKey,
                    holdExpiresAt,
                })
                .returning();

            // Log hold created event
            await this.eventService.logEvent(
                reservation.id,
                'hold_created',
                {
                    experienceId,
                    timeSlotId,
                    numberOfGuests,
                    totalPrice,
                    holdExpiresAt,
                    discountApplied: totalDiscountAmount,
                },
                {
                    userId,
                    source: 'api',
                    metadata: {
                        guestEmail,
                        holdDurationMinutes: HOLD_DURATION_MINUTES,
                    },
                }
            );

            return {
                reservation: {
                    ...reservation,
                    holdExpiresAt,
                },
                appliedDiscounts: {
                    groupDiscount,
                    earlyBirdDiscount,
                    totalDiscount: totalDiscountAmount,
                },
                holdDurationMinutes: HOLD_DURATION_MINUTES,
            };
        });
    }

    async convertHoldToReservation(holdId: string, paymentIntentId?: string) {
        const hold = await this.db.reservations.getById(holdId);
        
        if (!hold) {
            throw new Error(ERRORS.RESERVATIONS.NOT_FOUND.CODE);
        }

        // Check various invalid states
        if (hold.status === 'cancelled') {
            // Check if it was cancelled due to expiration
            if (hold.cancellationReason?.includes('expired')) {
                throw new Error(ERRORS.RESERVATIONS.HOLD_EXPIRED.CODE);
            }
            throw new Error(ERRORS.RESERVATIONS.CANNOT_CANCEL.CODE);
        }

        if (hold.status === 'confirmed' || hold.status === 'completed') {
            // Hold was already converted successfully
            return {
                reservation: hold,
                duplicate: true,
            };
        }

        if (hold.status === 'pending') {
            // Hold was already converted
            if (hold.paymentIntentId) {
                // Payment was already created, return existing data
                const payment = await this.db.payments.getByPaymentIntentId(hold.paymentIntentId);
                return {
                    reservation: hold,
                    paymentClientSecret: payment?.status === 'pending' ? null : undefined, // Don't expose secret for processed payments
                    duplicate: true,
                };
            } else {
                // Hold was converted but payment creation failed previously
                // Continue with the flow to create payment intent
                // Don't throw error - let it proceed to create payment
            }
        }

        if (hold.status !== 'held' && hold.status !== 'pending') {
            throw new Error(ERRORS.RESERVATIONS.INVALID_HOLD_STATUS.CODE);
        }

        // Check if hold has expired (only for 'held' status)
        if (hold.status === 'held' && hold.holdExpiresAt && new Date() > hold.holdExpiresAt) {
            throw new Error(ERRORS.RESERVATIONS.HOLD_EXPIRED.CODE);
        }

        // First, update the hold status in a transaction (only if still 'held')
        if (hold.status === 'held') {
            await this.db.transaction(async (tx) => {
            // Update reservation status from held to pending
            await tx
                .update(reservationsTable)
                .set({
                    status: 'pending',
                    paymentIntentId,
                    holdExpiresAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(reservationsTable.id, holdId));

            // Log hold converted event
            await this.eventService.logEvent(
                holdId,
                'hold_converted',
                {
                    convertedAt: new Date(),
                    paymentIntentId,
                },
                {
                    userId: hold.userId,
                    source: 'api',
                }
            );
            });
        }

        // Create payment intent outside of transaction
        let paymentIntent;
        let paymentError;
        
        if (!paymentIntentId) {
            try {
                paymentIntent = await this.paymentService.createPaymentIntent({
                    amount: hold.totalPrice,
                    reservationId: hold.id,
                    userId: hold.userId,
                    metadata: {
                        experienceId: hold.experienceId,
                        timeSlotId: hold.timeSlotId,
                        numberOfGuests: hold.numberOfGuests.toString(),
                    },
                    idempotencyKey: `${hold.idempotencyKey}-payment`,
                });

                // Update with payment intent ID
                await this.db.reservations.update(holdId, {
                    paymentIntentId: paymentIntent.paymentIntentId,
                    updatedAt: new Date(),
                });
            } catch (error) {
                paymentError = error as Error;
                // Log payment creation failure
                await this.eventService.logPaymentFailed(
                    holdId,
                    {
                        paymentIntentId: 'creation_failed',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    },
                    {
                        userId: hold.userId,
                        source: 'api',
                    }
                );
                
                // Don't revert the hold conversion - let frontend retry
                // The reservation is now in 'pending' state without payment
            }
        }

        const updatedReservation = await this.db.reservations.getById(holdId);

        // Return result with payment error if applicable
        const result: any = {
            reservation: updatedReservation,
            paymentClientSecret: paymentIntent?.clientSecret,
        };
        
        if (paymentError) {
            result.paymentError = {
                code: (paymentError as Error).message || 'PAYMENT_PROCESSING_FAILED',
                message: 'Payment setup failed. Please try again.',
                canRetry: true
            };
        }
        
        return result;
    }

    async releaseExpiredHolds() {
        // This would typically be called by a scheduled job
        const expiredHolds = await this.db.reservations.getExpiredHolds();
        
        for (const hold of expiredHolds) {
            try {
                await this.db.transaction(async (tx) => {
                    await tx
                        .update(reservationsTable)
                        .set({
                            status: 'cancelled',
                            cancelledAt: new Date(),
                            cancellationReason: 'Hold expired',
                            updatedAt: new Date(),
                        })
                        .where(eq(reservationsTable.id, hold.id));

                    // Log hold expired event
                    await this.eventService.logEvent(
                        hold.id,
                        'hold_expired',
                        {
                            expiredAt: new Date(),
                            holdExpiresAt: hold.holdExpiresAt,
                        },
                        {
                            source: 'system',
                            metadata: {
                                reason: 'Automatic expiry',
                            },
                        }
                    );
                });
            } catch (error) {
                console.error(`Failed to release expired hold ${hold.id}:`, error);
            }
        }
    }

    async createReservation(request: CreateReservationRequest) {
        const { 
            authorization, 
            experienceId, 
            timeSlotId, 
            numberOfGuests,
            guestName,
            guestEmail,
            guestPhone,
            specialRequests,
            idempotencyKey
        } = request;

        const { sub: userId } = decodeToken(authorization);

        // Check for existing reservation with same idempotency key
        const existingReservation = await this.db.reservations.getByIdempotencyKey(idempotencyKey);
        if (existingReservation) {
            // Check if the reservation has failed or been cancelled
            if (existingReservation.status === 'cancelled' || 
                (existingReservation.status === 'pending' && existingReservation.paymentStatus === 'failed')) {
                
                // Cancel the old reservation and create a new one
                await this.db.transaction(async (tx) => {
                    if (existingReservation.status !== 'cancelled') {
                        await tx
                            .update(reservationsTable)
                            .set({
                                status: 'cancelled',
                                cancelledAt: new Date(),
                                cancellationReason: 'Failed reservation replaced by new attempt',
                                updatedAt: new Date(),
                            })
                            .where(eq(reservationsTable.id, existingReservation.id));
                    }

                    // Log the replacement event
                    await this.eventService.logEvent(
                        existingReservation.id,
                        'cancelled',
                        {
                            reason: 'Replaced by new reservation attempt',
                            replacedDueToFailure: true,
                        },
                        {
                            userId,
                            source: 'api',
                        }
                    );
                });
                
                // Continue to create a new reservation (don't return here)
            } else {
                // Existing reservation is still valid, return it
                let paymentIntent;
                if (existingReservation.paymentIntentId) {
                    const payment = await this.db.payments.getByPaymentIntentId(existingReservation.paymentIntentId);
                    if (payment) {
                        paymentIntent = { clientSecret: null }; // Don't expose client secret on duplicate requests
                    }
                }
                
                return {
                    reservation: {
                        ...existingReservation,
                        paymentClientSecret: paymentIntent?.clientSecret,
                    },
                    appliedDiscounts: {
                        groupDiscount: { amount: 0, type: null },
                        earlyBirdDiscount: { amount: 0, type: null },
                        totalDiscount: existingReservation.discountApplied || 0,
                    },
                    duplicate: true,
                };
            }
        }

        // Use transaction to ensure atomicity
        return await this.db.transaction(async (tx) => {
            // First, get the time slot with calculated booked count
            const timeSlot = await this.db.timeSlots.getByIdWithBookedCount(timeSlotId);

            if (!timeSlot) {
                throw new Error(ERRORS.TIME_SLOT.NOT_FOUND.CODE);
            }

            if (timeSlot.status !== "available") {
                throw new Error(ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE);
            }

            // Re-check capacity with the locked row
            if (timeSlot.bookedCount + numberOfGuests > timeSlot.maxCapacity) {
                throw new Error(ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.CODE);
            }

            const experienceResults = await tx
                .select()
                .from(experiencesTable)
                .where(eq(experiencesTable.id, experienceId));
            
            const experience = experienceResults[0] || null;

            if (!experience) {
                throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
            }

            const basePrice = experience.pricePerPerson * numberOfGuests;

            // Calculate both discounts independently
            const groupDiscount = this.calculateGroupDiscount(
                experience,
                numberOfGuests,
                basePrice
            );
            const earlyBirdDiscount = this.calculateEarlyBirdDiscount(
                experience,
                timeSlot,
                basePrice
            );

            // Apply both discounts if applicable
            const totalDiscountAmount =
                groupDiscount.amount + earlyBirdDiscount.amount;

            // Determine discount type string
            let discountType = null;
            if (groupDiscount.type && earlyBirdDiscount.type) {
                discountType = `${groupDiscount.type},${earlyBirdDiscount.type}`;
            } else if (groupDiscount.type) {
                discountType = groupDiscount.type;
            } else if (earlyBirdDiscount.type) {
                discountType = earlyBirdDiscount.type;
            }

            const totalPrice = basePrice - totalDiscountAmount;

            const reservationReference = this.generateReservationReference();

            // Create reservation with pending payment status
            const [reservation] = await tx
                .insert(reservationsTable)
                .values({
                    userId,
                    experienceId,
                    timeSlotId,
                    numberOfGuests,
                    totalPrice,
                    originalPrice: basePrice,
                    discountApplied: totalDiscountAmount,
                    discountType,
                    reservationReference,
                    guestName,
                    guestEmail,
                    guestPhone,
                    specialRequests,
                    paymentStatus: "pending",
                    status: "pending",
                    idempotencyKey,
                })
                .returning();

            // Log reservation created event
            await this.eventService.logReservationCreated(
                reservation.id,
                {
                    experienceId,
                    timeSlotId,
                    numberOfGuests,
                    totalPrice,
                    discountApplied: totalDiscountAmount,
                    idempotencyKey,
                },
                {
                    userId,
                    source: 'api',
                    metadata: {
                        guestEmail,
                        specialRequests,
                    },
                }
            );

            // No need to update booked count - it's calculated dynamically now

            // Transaction completed, now create payment intent outside transaction
            // This ensures inventory is locked even if payment setup fails
            let paymentIntent;
            try {
                paymentIntent = await this.paymentService.createPaymentIntent({
                    amount: totalPrice,
                    reservationId: reservation.id,
                    userId,
                    metadata: {
                        experienceId,
                        timeSlotId,
                        numberOfGuests: numberOfGuests.toString(),
                    },
                    idempotencyKey,
                });

                // Log payment initiated event
                await this.eventService.logPaymentInitiated(
                    reservation.id,
                    {
                        paymentIntentId: paymentIntent.paymentId,
                        amount: totalPrice * 100, // Convert to cents
                        currency: 'usd',
                    },
                    {
                        userId,
                        source: 'api',
                    }
                );
            } catch (error) {
                // Log payment failed event
                await this.eventService.logPaymentFailed(
                    reservation.id,
                    {
                        paymentIntentId: 'unknown',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    },
                    {
                        userId,
                        source: 'api',
                    }
                );
                
                // If payment intent creation fails, we need to release the inventory
                // This would ideally be handled by a background job
                console.error('Payment intent creation failed, need to release inventory:', error);
                throw error;
            }

            return {
                reservation: {
                    ...reservation,
                    paymentClientSecret: paymentIntent.clientSecret,
                },
                appliedDiscounts: {
                    groupDiscount,
                    earlyBirdDiscount,
                    totalDiscount: totalDiscountAmount,
                },
            };
        });
    }

    async confirmReservation(reservationId: string, paymentIntentId: string) {
        // Get reservation
        const reservation = await this.db.reservations.getById(reservationId);
        if (!reservation) {
            throw new Error(ERRORS.RESERVATIONS.NOT_FOUND.CODE);
        }

        // Verify payment and capture it
        const paymentResult = await this.paymentService.capturePayment({
            paymentIntentId,
            reservationId,
        });

        // Update reservation status
        await this.db.reservations.update(reservationId, {
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentIntentId,
            updatedAt: new Date(),
        });

        // Log confirmation event
        await this.eventService.logReservationConfirmed(
            reservationId,
            {
                paymentIntentId,
                confirmedAt: new Date(),
            },
            {
                userId: reservation.userId,
                source: 'api',
            }
        );

        // TODO: Send confirmation email
        
        return {
            reservation: {
                ...reservation,
                status: 'confirmed',
                paymentStatus: 'paid',
            },
            payment: paymentResult,
        };
    }

    async cancelReservation(reservationId: string, reason?: string) {
        const reservation = await this.db.reservations.getById(reservationId);
        if (!reservation) {
            throw new Error(ERRORS.RESERVATIONS.NOT_FOUND.CODE);
        }

        // Can only cancel pending or confirmed reservations
        if (reservation.status && !['pending', 'confirmed'].includes(reservation.status)) {
            throw new Error(ERRORS.RESERVATIONS.CANNOT_CANCEL.CODE);
        }

        return await this.db.transaction(async (tx) => {
            // Update reservation status
            await tx
                .update(reservationsTable)
                .set({
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancellationReason: reason,
                    updatedAt: new Date(),
                })
                .where(eq(reservationsTable.id, reservationId));

            // Log cancellation event
            await this.eventService.logReservationCancelled(
                reservationId,
                {
                    reason,
                    cancelledBy: 'user', // TODO: Get actual user/admin who cancelled
                    refundInitiated: reservation.paymentStatus === 'paid',
                },
                {
                    userId: reservation.userId,
                    source: 'api',
                }
            );

            // No need to update booked count - it's calculated dynamically from reservations

            // Cancel payment if exists
            if (reservation.paymentIntentId) {
                await this.paymentService.cancelPayment(reservation.paymentIntentId);
            }

            // Process refund if payment was captured
            if (reservation.paymentStatus === 'paid') {
                const payment = await this.db.payments.getByReservationId(reservationId);
                if (payment) {
                    const refund = await this.paymentService.refundPayment(payment.id, undefined, reason);
                    
                    // Log refund event
                    await this.eventService.logReservationRefunded(
                        reservationId,
                        {
                            refundId: refund.refundId,
                            amount: refund.amount,
                            reason,
                        },
                        {
                            userId: reservation.userId,
                            source: 'api',
                        }
                    );
                }
            }

            return { success: true };
        });
    }

    private generateReservationReference(): string {
        const bytes = crypto.randomBytes(12);

        return bytes.toString("hex").toUpperCase().slice(0, 12);
    }

    private calculateGroupDiscount(
        experience: Experience,
        numberOfGuests: number,
        basePrice: number
    ): DiscountResult {
        if (!experience.groupDiscountsEnabled) {
            return {
                amount: 0,
                type: null,
            };
        }

        // Check for 5+ guest discount first (higher discount)
        if (numberOfGuests >= 5 && experience.discountPercentageFor5Plus) {
            const discountAmount = Math.round(
                basePrice * (experience.discountPercentageFor5Plus / 100)
            );
            return {
                amount: discountAmount,
                type: "group_5_plus",
            };
        }

        // Check for 3+ guest discount
        if (numberOfGuests >= 3 && experience.discountPercentageFor3Plus) {
            const discountAmount = Math.round(
                basePrice * (experience.discountPercentageFor3Plus / 100)
            );
            return {
                amount: discountAmount,
                type: "group_3_plus",
            };
        }

        return { amount: 0, type: null };
    }

    private calculateEarlyBirdDiscount(
        experience: Experience,
        timeSlot: TimeSlot,
        basePrice: number
    ): DiscountResult {
        if (
            !experience.earlyBirdEnabled ||
            !experience.earlyBirdDaysInAdvance ||
            !experience.earlyBirdDiscountPercentage
        ) {
            return { amount: 0, type: null };
        }

        const slotDate = dayjs(timeSlot.slotDateTime);
        const daysUntilExperience = slotDate.diff(dayjs(), "day");

        if (daysUntilExperience >= experience.earlyBirdDaysInAdvance) {
            const discountAmount = Math.round(
                basePrice * (experience.earlyBirdDiscountPercentage / 100)
            );
            return {
                amount: discountAmount,
                type: "early_bird",
            };
        }

        return { amount: 0, type: null };
    }
}
