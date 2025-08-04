import crypto from "crypto";
import dayjs from "dayjs";
import { eq, and, sql, desc } from "drizzle-orm";

import { CreateReservationRequest } from "../validations";
import { ReservationServiceOptions } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";
import { experiencesTable, reservationsTable, experienceTimeSlotsTable, usersTable } from "@/database/schemas";
import { PaymentService } from "@/payments/services/payment";
import { ReservationEventService } from "./event";
import { timeSlotsLockingQueryManager } from "@/database/postgres/query_managers/time_slots_locking";

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
            // Use locking to prevent race conditions
            const capacityCheck = await timeSlotsLockingQueryManager.checkAndReserveCapacity(
                tx,
                timeSlotId,
                numberOfGuests,
                true // Include held reservations
            );

            if (!capacityCheck.success) {
                switch (capacityCheck.reason) {
                    case 'TIME_SLOT_NOT_FOUND':
                        throw new Error(ERRORS.TIME_SLOT.NOT_FOUND.CODE);
                    case 'TIME_SLOT_NOT_AVAILABLE':
                        throw new Error(ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE);
                    case 'NOT_ENOUGH_CAPACITY':
                        throw new Error(ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.CODE);
                    default:
                        throw new Error(ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE);
                }
            }

            const timeSlot = capacityCheck.timeSlot;

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

    async convertHoldToReservation(
        holdId: string, 
        paymentIntentId?: string,
        paymentMethodId?: string,
        savePaymentMethod?: boolean
    ) {
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
                // Payment was already created
                const payment = await this.db.payments.getByPaymentIntentId(hold.paymentIntentId);
                
                if (payment && payment.status === 'pending') {
                    // Check if payment intent is still valid
                    try {
                        const paymentIntent = await this.paymentService.getPaymentIntent(hold.paymentIntentId);
                        
                        // Check if payment intent is expired or cancelled
                        if (paymentIntent.status === 'canceled' || 
                            this.paymentService.isPaymentIntentExpired(paymentIntent)) {
                            
                            // Create recovery payment intent
                            console.log(`Recovering expired/cancelled payment intent for reservation ${holdId}`);
                            
                            // Cancel the old payment intent if not already cancelled
                            if (paymentIntent.status !== 'canceled') {
                                await this.paymentService.cancelPayment(hold.paymentIntentId);
                            }
                            
                            // Map internal payment method ID to Stripe ID if provided
                            let stripePaymentMethodId: string | undefined;
                            if (paymentMethodId) {
                                const paymentMethod = await this.db.paymentMethods.getById(paymentMethodId);
                                
                                if (!paymentMethod) {
                                    throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                                }
                                
                                // Verify the payment method belongs to the user
                                if (paymentMethod.userId !== hold.userId) {
                                    throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                                }
                                
                                // Verify payment method is active
                                if (paymentMethod.status !== 'active') {
                                    throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                                }
                                
                                stripePaymentMethodId = paymentMethod.stripePaymentMethodId;
                            }
                            
                            // Create new payment intent with recovery idempotency key
                            const recoveryKey = `${hold.idempotencyKey}-recovery-${Date.now()}`;
                            const newPaymentIntent = await this.paymentService.createPaymentIntent({
                                amount: hold.totalPrice,
                                reservationId: hold.id,
                                userId: hold.userId,
                                metadata: {
                                    experienceId: hold.experienceId,
                                    timeSlotId: hold.timeSlotId,
                                    numberOfGuests: hold.numberOfGuests.toString(),
                                    recovery: 'true'
                                },
                                idempotencyKey: recoveryKey,
                                stripeCustomerId: payment.stripeCustomerId || undefined,
                                paymentMethodId: stripePaymentMethodId,
                                savePaymentMethod,
                            });
                            
                            // Update reservation with new payment intent
                            await this.db.reservations.update(holdId, {
                                paymentIntentId: newPaymentIntent.paymentIntentId,
                                updatedAt: new Date(),
                            });
                            
                            // Log recovery event
                            await this.eventService.logEvent(
                                holdId,
                                'payment_recovered',
                                {
                                    oldPaymentIntentId: hold.paymentIntentId,
                                    newPaymentIntentId: newPaymentIntent.paymentIntentId,
                                    reason: paymentIntent.status === 'canceled' ? 'cancelled' : 'expired'
                                },
                                {
                                    userId: hold.userId,
                                    source: 'api'
                                }
                            );
                            
                            return {
                                reservation: {
                                    ...hold,
                                    paymentIntentId: newPaymentIntent.paymentIntentId
                                },
                                paymentClientSecret: newPaymentIntent.clientSecret,
                                recovered: true
                            };
                        }
                        
                        // Payment intent is still valid but pending
                        if (paymentIntent.status === 'requires_payment_method' || 
                            paymentIntent.status === 'requires_confirmation') {
                            // If a payment method was provided, update the payment intent
                            if (paymentMethodId) {
                                // Map internal payment method ID to Stripe ID
                                const paymentMethod = await this.db.paymentMethods.getById(paymentMethodId);
                                
                                if (!paymentMethod) {
                                    throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                                }
                                
                                // Verify the payment method belongs to the user
                                if (paymentMethod.userId !== hold.userId) {
                                    throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                                }
                                
                                // Verify payment method is active
                                if (paymentMethod.status !== 'active') {
                                    throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                                }
                                
                                try {
                                    // Update the payment intent with the payment method
                                    const updatedIntent = await this.paymentService.updatePaymentIntent(
                                        hold.paymentIntentId,
                                        {
                                            payment_method: paymentMethod.stripePaymentMethodId,
                                            confirm: true // Auto-confirm for saved cards
                                        }
                                    );
                                    
                                    // Return updated status
                                    return {
                                        reservation: hold,
                                        paymentStatus: updatedIntent.status,
                                        requiresAction: updatedIntent.status === 'requires_action',
                                        duplicate: false
                                    };
                                } catch (error) {
                                    console.error('Failed to update payment intent with payment method:', error);
                                    throw new Error(ERRORS.PAYMENT.PROCESSING_FAILED.CODE);
                                }
                            }
                            
                            // Don't expose client secret on subsequent requests for security
                            return {
                                reservation: hold,
                                paymentStatus: paymentIntent.status,
                                requiresAction: true,
                                duplicate: true
                            };
                        }
                    } catch (error) {
                        console.error('Failed to check payment intent status:', error);
                        // Continue without recovery
                    }
                }
                
                // Payment is no longer pending (succeeded, processing, etc.)
                return {
                    reservation: hold,
                    paymentStatus: payment?.status,
                    duplicate: true
                };
            } else {
                // Hold was converted but payment creation failed previously
                // Continue with the flow to create payment intent
                console.log('Recovering from previous payment creation failure');
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
                // Get user's stripe customer ID if using saved payment method
                let stripeCustomerId: string | undefined;
                let stripePaymentMethodId: string | undefined;
                
                if (paymentMethodId || savePaymentMethod) {
                    const user = await this.db.users.getById(hold.userId);
                    stripeCustomerId = user?.stripeCustomerId || undefined;
                    
                    // Map internal payment method ID to Stripe payment method ID
                    if (paymentMethodId) {
                        // Frontend sends internal database ID, we need to get the Stripe ID
                        const paymentMethod = await this.db.paymentMethods.getById(paymentMethodId);
                        
                        if (!paymentMethod) {
                            throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                        }
                        
                        // Verify the payment method belongs to the user
                        if (paymentMethod.userId !== hold.userId) {
                            throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                        }
                        
                        // Verify payment method is active
                        if (paymentMethod.status !== 'active') {
                            throw new Error(ERRORS.PAYMENT.METHOD_NOT_FOUND.CODE);
                        }
                        
                        stripePaymentMethodId = paymentMethod.stripePaymentMethodId;
                    }
                }

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
                    stripeCustomerId,
                    paymentMethodId: stripePaymentMethodId,
                    savePaymentMethod,
                });

                // Update with payment intent ID
                await this.db.reservations.update(holdId, {
                    paymentIntentId: paymentIntent.paymentIntentId,
                    updatedAt: new Date(),
                });

                // Get the actual payment intent status from Stripe
                const paymentStatus = await this.paymentService.getPaymentIntentStatus(
                    paymentIntent.paymentIntentId
                );

                // Update reservation with current payment status
                const updatedReservation = await this.db.reservations.getById(holdId);

                // Determine what to return based on payment status
                if (paymentStatus.status === 'succeeded') {
                    // Payment succeeded immediately (saved card, no 3DS)
                    await this.db.reservations.update(holdId, {
                        paymentStatus: 'paid',
                        status: 'confirmed',
                        updatedAt: new Date(),
                    });

                    return {
                        reservation: {
                            ...updatedReservation,
                            paymentStatus: 'paid',
                            status: 'confirmed',
                        },
                        paymentStatus: 'succeeded',
                        // NO client secret needed - payment is complete
                    };
                } else if (paymentStatus.status === 'processing') {
                    // Payment is processing (some cards take time)
                    await this.db.reservations.update(holdId, {
                        paymentStatus: 'processing',
                        updatedAt: new Date(),
                    });

                    return {
                        reservation: {
                            ...updatedReservation,
                            paymentStatus: 'processing',
                        },
                        paymentStatus: 'processing',
                        // NO client secret needed - payment is processing
                    };
                } else if (paymentStatus.status === 'requires_action') {
                    // 3D Secure or other action required
                    return {
                        reservation: updatedReservation,
                        paymentClientSecret: paymentIntent.clientSecret,
                        requiresAction: true,
                        paymentStatus: 'requires_action',
                    };
                } else if (paymentStatus.status === 'requires_payment_method') {
                    // New card payment or saved card failed
                    return {
                        reservation: updatedReservation,
                        paymentClientSecret: paymentIntent.clientSecret,
                        paymentStatus: 'requires_payment_method',
                    };
                } else {
                    // Other status (canceled, failed, etc.)
                    return {
                        reservation: updatedReservation,
                        paymentStatus: paymentStatus.status,
                        paymentError: paymentStatus.lastError,
                    };
                }
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
                
                // Update payment status to failed
                await this.db.reservations.update(holdId, {
                    paymentStatus: 'failed',
                    updatedAt: new Date(),
                });
                
                const updatedReservation = await this.db.reservations.getById(holdId);
                
                return {
                    reservation: updatedReservation,
                    paymentError: {
                        code: (paymentError as Error).message || 'PAYMENT_PROCESSING_FAILED',
                        message: 'Payment setup failed. Please try again.',
                        canRetry: true
                    }
                };
            }
        }

        // If payment intent ID was provided, just return the reservation
        const updatedReservation = await this.db.reservations.getById(holdId);
        return {
            reservation: updatedReservation,
        };
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

        // PHASE 1: Pre-check availability and calculate pricing without locking
        const availabilityCheck = await this.checkAvailabilityAndPricing(
            experienceId,
            timeSlotId,
            numberOfGuests
        );

        if (!availabilityCheck.available) {
            throw new Error(availabilityCheck.errorCode || ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE);
        }

        const {
            experience,
            timeSlot,
            totalPrice,
            basePrice,
            groupDiscount,
            earlyBirdDiscount,
            totalDiscountAmount,
            discountType
        } = availabilityCheck;

        // PHASE 2: Create payment intent BEFORE creating reservation
        let paymentIntent;
        try {
            paymentIntent = await this.paymentService.createPaymentIntent({
                amount: totalPrice,
                reservationId: crypto.randomBytes(16).toString('hex'), // Temporary ID for metadata
                userId,
                metadata: {
                    experienceId,
                    timeSlotId,
                    numberOfGuests: numberOfGuests.toString(),
                    guestEmail,
                },
                idempotencyKey: `${idempotencyKey}-payment`,
            });
        } catch (error) {
            // Payment setup failed - no reservation created, no capacity reduced
            console.error('Payment intent creation failed:', error);
            
            // Log payment failure (without reservation ID)
            await this.eventService.logEvent(
                'payment_setup_failed', // Use a special ID for pre-reservation failures
                'payment_failed',
                {
                    experienceId,
                    timeSlotId,
                    numberOfGuests,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                },
                {
                    userId,
                    source: 'api',
                    metadata: {
                        guestEmail,
                        stage: 'pre_reservation',
                    },
                }
            );
            
            throw new Error(ERRORS.PAYMENT.SETUP_FAILED.CODE);
        }

        // PHASE 3: Create reservation with payment intent already created
        return await this.db.transaction(async (tx) => {
            // Re-check and lock capacity atomically
            const capacityCheck = await timeSlotsLockingQueryManager.checkAndReserveCapacity(
                tx,
                timeSlotId,
                numberOfGuests,
                false // Don't include held reservations for direct bookings
            );

            if (!capacityCheck.success) {
                // Capacity no longer available - cancel the payment intent
                try {
                    await this.paymentService.cancelPayment(paymentIntent.paymentIntentId);
                } catch (cancelError) {
                    console.error('Failed to cancel payment intent after capacity check failed:', cancelError);
                }
                
                switch (capacityCheck.reason) {
                    case 'TIME_SLOT_NOT_FOUND':
                        throw new Error(ERRORS.TIME_SLOT.NOT_FOUND.CODE);
                    case 'TIME_SLOT_NOT_AVAILABLE':
                        throw new Error(ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE);
                    case 'NOT_ENOUGH_CAPACITY':
                        throw new Error(ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.CODE);
                    default:
                        throw new Error(ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE);
                }
            }

            const reservationReference = this.generateReservationReference();

            // Create reservation with payment intent already set
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
                    paymentIntentId: paymentIntent.paymentIntentId,
                    idempotencyKey,
                })
                .returning();

            // Update payment record with actual reservation ID
            if (paymentIntent.paymentId) {
                await this.db.payments.update(paymentIntent.paymentId, {
                    reservationId: reservation.id,
                    updatedAt: new Date(),
                });
            }

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
                    paymentIntentId: paymentIntent.paymentIntentId,
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

            // Log payment initiated event
            await this.eventService.logPaymentInitiated(
                reservation.id,
                {
                    paymentIntentId: paymentIntent.paymentIntentId,
                    amount: totalPrice * 100, // Convert to cents
                    currency: 'usd',
                },
                {
                    userId,
                    source: 'api',
                }
            );

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

    /**
     * Check availability and calculate pricing without locking
     * This is used for pre-validation before payment intent creation
     */
    private async checkAvailabilityAndPricing(
        experienceId: string,
        timeSlotId: string,
        numberOfGuests: number
    ) {
        // Get time slot without locking
        const timeSlotResults = await this.db.instance
            .select()
            .from(experienceTimeSlotsTable)
            .where(eq(experienceTimeSlotsTable.id, timeSlotId));
        
        const timeSlot = timeSlotResults[0] || null;
        
        if (!timeSlot) {
            return {
                available: false,
                errorCode: ERRORS.TIME_SLOT.NOT_FOUND.CODE,
            };
        }

        if (timeSlot.status !== 'available') {
            return {
                available: false,
                errorCode: ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE,
            };
        }

        // Calculate current booked count (non-locking read)
        const bookingResult = await this.db.instance
            .select({
                totalGuests: sql<number>`COALESCE(SUM(number_of_guests), 0)`
            })
            .from(reservationsTable)
            .where(
                and(
                    eq(reservationsTable.timeSlotId, timeSlotId),
                    sql`status IN ('pending', 'confirmed')`
                )
            );
        
        const bookedCount = Number(bookingResult[0]?.totalGuests || 0);
        const remainingCapacity = timeSlot.maxCapacity - bookedCount;
        
        if (remainingCapacity < numberOfGuests) {
            return {
                available: false,
                errorCode: ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.CODE,
            };
        }

        // Get experience
        const experienceResults = await this.db.instance
            .select()
            .from(experiencesTable)
            .where(eq(experiencesTable.id, experienceId));
        
        const experience = experienceResults[0] || null;

        if (!experience) {
            return {
                available: false,
                errorCode: ERRORS.EXPERIENCE.NOT_FOUND.CODE,
            };
        }

        // Calculate pricing
        const basePrice = experience.pricePerPerson * numberOfGuests;
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

        return {
            available: true,
            experience,
            timeSlot,
            totalPrice,
            basePrice,
            groupDiscount,
            earlyBirdDiscount,
            totalDiscountAmount,
            discountType,
            remainingCapacity,
        };
    }

    async getUserReservations(userId: string, filters?: {
        status?: string;
        limit?: number;
        offset?: number;
    }) {
        // Use optimized query with joins and database-level pagination
        const { results, total, limit, offset } = await this.db.reservations.getByUserIdWithDetails(
            userId,
            filters
        );
        
        // Transform results into the expected format
        const formattedReservations = results.map(({ reservation, experience, timeSlot, host }) => ({
            ...reservation,
            experience: experience ? {
                id: experience.id,
                title: experience.title,
                tagline: experience.tagline,
                type: experience.type,
                description: experience.description,
                startingLocationAddress: experience.startingLocationAddress,
                endingLocationAddress: experience.endingLocationAddress,
                meetingLocationInstructions: experience.meetingLocationInstructions,
                coverImage: experience.coverImage,
                galleryImages: experience.galleryImages,
                pricePerPerson: experience.pricePerPerson,
                durationHours: experience.durationHours,
                cancellationPolicy: experience.cancellationPolicy,
                categoryId: experience.categoryId,
                subCategoryId: experience.subCategoryId,
                minGuests: experience.minGuests,
                maxGuests: experience.maxGuests,
                host: host ? {
                    id: host.id,
                    firstName: host.firstName,
                    lastName: host.lastName,
                    profileImage: host.profileImage,
                } : null,
            } : null,
            timeSlot: timeSlot ? {
                id: timeSlot.id,
                slotDateTime: timeSlot.slotDateTime,
                localDate: timeSlot.localDate,
                localTime: timeSlot.localTime,
            } : null,
        }));
        
        return {
            reservations: formattedReservations,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        };
    }

    async completeReservation(
        reservationId: string,
        hostId: string,
        completionData: {
            actualAttendance?: number;
            hostNotes?: string;
            incidentReport?: string;
            noShow?: boolean;
        }
    ) {
        // Get reservation with experience details
        const reservation = await this.db.transaction(async (tx) => {
            const result = await tx
                .select({
                    reservation: reservationsTable,
                    experience: experiencesTable,
                    timeSlot: experienceTimeSlotsTable,
                })
                .from(reservationsTable)
                .innerJoin(
                    experiencesTable,
                    eq(reservationsTable.experienceId, experiencesTable.id)
                )
                .innerJoin(
                    experienceTimeSlotsTable,
                    eq(reservationsTable.timeSlotId, experienceTimeSlotsTable.id)
                )
                .where(eq(reservationsTable.id, reservationId))
                .limit(1);

            return result[0] || null;
        });

        if (!reservation) {
            throw new Error(ERRORS.RESERVATIONS.NOT_FOUND.CODE);
        }

        // Verify host owns the experience
        if (reservation.experience.hostId !== hostId) {
            throw new Error(ERRORS.RESERVATIONS.FORBIDDEN_COMPLETE.CODE);
        }

        // Check reservation status - can only complete confirmed reservations
        if (reservation.reservation.status !== 'confirmed') {
            throw new Error(ERRORS.RESERVATIONS.INVALID_STATUS_TRANSITION.CODE);
        }

        // Check if experience time has passed (with a 1-hour buffer for early completion)
        const experienceTime = new Date(reservation.timeSlot.slotDateTime);
        const now = new Date();
        const oneHourBeforeExperience = new Date(experienceTime.getTime() - 60 * 60 * 1000);
        
        if (now < oneHourBeforeExperience) {
            throw new Error(ERRORS.RESERVATIONS.EXPERIENCE_NOT_STARTED.CODE);
        }

        // Update reservation in transaction
        const updatedReservation = await this.db.transaction(async (tx) => {
            // Update reservation status
            const updated = await tx
                .update(reservationsTable)
                .set({
                    status: 'completed',
                    updatedAt: new Date(),
                })
                .where(eq(reservationsTable.id, reservationId))
                .returning();

            // Log completion event with details
            await this.eventService.logEvent(
                reservationId,
                'reservation_completed',
                {
                    completedAt: new Date(),
                    completedBy: 'host',
                    hostId,
                    actualAttendance: completionData.actualAttendance,
                    noShow: completionData.noShow,
                    hostNotes: completionData.hostNotes,
                    incidentReport: completionData.incidentReport,
                    originalGuests: reservation.reservation.numberOfGuests,
                },
                {
                    userId: hostId,
                    source: 'host_api',
                    metadata: {
                        experienceId: reservation.experience.id,
                        timeSlotId: reservation.timeSlot.id,
                    },
                }
            );

            // If there's an incident report, log it separately for easier tracking
            if (completionData.incidentReport) {
                await this.eventService.logEvent(
                    reservationId,
                    'incident_reported',
                    {
                        reportedAt: new Date(),
                        reportedBy: 'host',
                        hostId,
                        incidentDetails: completionData.incidentReport,
                    },
                    {
                        userId: hostId,
                        source: 'host_api',
                        metadata: {
                            severity: 'requires_review',
                        },
                    }
                );
            }

            return updated[0];
        });

        // Trigger post-completion actions (async, don't wait)
        this.triggerPostCompletionActions(reservationId, reservation.reservation.userId, hostId).catch(error => {
            console.error('Error triggering post-completion actions:', error);
        });

        return updatedReservation;
    }

    private async triggerPostCompletionActions(
        reservationId: string,
        guestId: string,
        hostId: string
    ) {
        try {
            // Enable reviews for both guest and host
            // This would typically trigger notifications or update review eligibility
            console.log(`Enabling reviews for reservation ${reservationId}`);
            
            // TODO: Send notification to guest to leave a review
            // TODO: Update host statistics/metrics
            // TODO: Trigger payment finalization if using escrow
            
        } catch (error) {
            console.error('Failed to trigger post-completion actions:', error);
        }
    }

    async getHostReservations(
        hostId: string,
        filters: {
            experienceId?: string;
            status?: string;
            fromDate?: string;
            toDate?: string;
            limit?: number;
            offset?: number;
        }
    ) {
        const { 
            experienceId, 
            status, 
            fromDate, 
            toDate, 
            limit = 20, 
            offset = 0 
        } = filters;

        // Build the query with all necessary joins
        const query = this.db.transaction(async (tx) => {
            // First, get all experiences owned by this host
            let experienceIds: string[] = [];
            
            if (experienceId) {
                // Verify the host owns this specific experience
                const experience = await tx
                    .select()
                    .from(experiencesTable)
                    .where(and(
                        eq(experiencesTable.id, experienceId),
                        eq(experiencesTable.hostId, hostId)
                    ))
                    .limit(1);
                
                if (experience.length === 0) {
                    throw new Error(ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE);
                }
                
                experienceIds = [experienceId];
            } else {
                // Get all experiences owned by this host
                const hostExperiences = await tx
                    .select({ id: experiencesTable.id })
                    .from(experiencesTable)
                    .where(eq(experiencesTable.hostId, hostId));
                
                experienceIds = hostExperiences.map(exp => exp.id);
            }

            if (experienceIds.length === 0) {
                return { reservations: [], total: 0 };
            }

            // Build conditions for reservations query
            const conditions = [
                sql`${reservationsTable.experienceId} IN (${sql.join(experienceIds.map(id => sql`${id}`), sql`, `)})`
            ];

            if (status) {
                conditions.push(eq(reservationsTable.status, status as any));
            }

            // Query reservations with time slot filtering
            let reservationsQuery = tx
                .select({
                    reservation: reservationsTable,
                    experience: experiencesTable,
                    timeSlot: experienceTimeSlotsTable,
                    user: usersTable,
                })
                .from(reservationsTable)
                .innerJoin(
                    experiencesTable,
                    eq(reservationsTable.experienceId, experiencesTable.id)
                )
                .innerJoin(
                    experienceTimeSlotsTable,
                    eq(reservationsTable.timeSlotId, experienceTimeSlotsTable.id)
                )
                .leftJoin(
                    usersTable,
                    eq(reservationsTable.userId, usersTable.id)
                );

            // Apply date filtering on time slots if provided
            const dateConditions = [];
            if (fromDate) {
                dateConditions.push(sql`${experienceTimeSlotsTable.slotDateTime} >= ${fromDate}`);
            }
            if (toDate) {
                dateConditions.push(sql`${experienceTimeSlotsTable.slotDateTime} <= ${toDate}`);
            }
            
            // Apply all conditions at once
            const allConditions = [...conditions, ...dateConditions];
            if (allConditions.length > 0) {
                reservationsQuery = reservationsQuery.where(and(...allConditions));
            }

            // Get total count
            const countResult = await tx
                .select({ count: sql<number>`count(*)` })
                .from(reservationsTable)
                .innerJoin(
                    experienceTimeSlotsTable,
                    eq(reservationsTable.timeSlotId, experienceTimeSlotsTable.id)
                )
                .where(and(...conditions, 
                    fromDate ? sql`${experienceTimeSlotsTable.slotDateTime} >= ${fromDate}` : undefined,
                    toDate ? sql`${experienceTimeSlotsTable.slotDateTime} <= ${toDate}` : undefined
                ));

            const total = Number(countResult[0]?.count || 0);

            // Apply pagination and ordering
            const reservations = await reservationsQuery
                .orderBy(desc(experienceTimeSlotsTable.slotDateTime))
                .limit(limit)
                .offset(offset);

            return {
                reservations: reservations.map(row => ({
                    id: row.reservation.id,
                    status: row.reservation.status,
                    reservationReference: row.reservation.reservationReference,
                    numberOfGuests: row.reservation.numberOfGuests,
                    totalPrice: row.reservation.totalPrice,
                    specialRequests: row.reservation.specialRequests,
                    paymentStatus: row.reservation.paymentStatus,
                    createdAt: row.reservation.createdAt,
                    experience: {
                        id: row.experience.id,
                        title: row.experience.title,
                        coverImage: row.experience.coverImage,
                    },
                    timeSlot: {
                        id: row.timeSlot.id,
                        slotDateTime: row.timeSlot.slotDateTime,
                        localDate: row.timeSlot.localDate,
                        localTime: row.timeSlot.localTime,
                    },
                    guest: row.user ? {
                        id: row.user.id,
                        firstName: row.user.firstName,
                        lastName: row.user.lastName,
                        email: row.user.email,
                        profileImage: row.user.profileImage,
                    } : {
                        name: row.reservation.guestName,
                        email: row.reservation.guestEmail,
                        phone: row.reservation.guestPhone,
                    },
                })),
                total,
            };
        });

        return query;
    }
}
