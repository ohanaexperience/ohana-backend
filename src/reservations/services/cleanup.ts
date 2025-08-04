import { eq, and, lt, isNull, sql } from "drizzle-orm";

import Postgres from "@/database/postgres";
import { reservationsTable } from "@/database/schemas";
import { ReservationEventService } from "./event";
import { PaymentService } from "@/payments/services/payment";

interface CleanupServiceOptions {
    database: Postgres;
}

export class ReservationCleanupService {
    private readonly db: Postgres;
    private readonly eventService: ReservationEventService;
    private readonly paymentService: PaymentService;

    // Configuration
    private readonly PENDING_TIMEOUT_MINUTES = 30; // 30 minutes for payment completion

    constructor({ database }: CleanupServiceOptions) {
        this.db = database;
        this.eventService = new ReservationEventService(database);
        this.paymentService = new PaymentService({ database });
    }

    /**
     * Clean up failed payment reservations
     * - Reservations in 'pending' status without payment intent for > 5 minutes
     * - Reservations in 'pending' status with failed payment for > 30 minutes
     */
    async cleanupFailedPayments() {
        const results = {
            processed: 0,
            cancelled: 0,
            errors: 0,
        };

        try {
            // Find reservations that need cleanup
            const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
            const paymentCutoffTime = new Date(Date.now() - this.PENDING_TIMEOUT_MINUTES * 60 * 1000); // 30 minutes ago

            // Get pending reservations without payment intent (payment creation failed)
            const orphanedReservations = await this.db.instance
                .select()
                .from(reservationsTable)
                .where(
                    and(
                        eq(reservationsTable.status, 'pending'),
                        isNull(reservationsTable.paymentIntentId),
                        lt(reservationsTable.createdAt, cutoffTime)
                    )
                );

            // Get pending reservations with old payment attempts
            const stalePendingReservations = await this.db.instance
                .select()
                .from(reservationsTable)
                .where(
                    and(
                        eq(reservationsTable.status, 'pending'),
                        eq(reservationsTable.paymentStatus, 'pending'),
                        lt(reservationsTable.createdAt, paymentCutoffTime)
                    )
                );

            const allReservationsToClean = [...orphanedReservations, ...stalePendingReservations];

            for (const reservation of allReservationsToClean) {
                results.processed++;

                try {
                    await this.cancelFailedReservation(reservation);
                    results.cancelled++;
                } catch (error) {
                    console.error(`Failed to clean up reservation ${reservation.id}:`, error);
                    results.errors++;
                }
            }

            console.log('Cleanup results:', results);
            return results;
        } catch (error) {
            console.error('Error during cleanup:', error);
            throw error;
        }
    }

    /**
     * Clean up expired holds
     */
    async cleanupExpiredHolds() {
        const results = {
            processed: 0,
            released: 0,
            errors: 0,
        };

        try {
            const now = new Date();
            
            // Find all expired holds
            const expiredHolds = await this.db.instance
                .select()
                .from(reservationsTable)
                .where(
                    and(
                        eq(reservationsTable.status, 'held'),
                        lt(reservationsTable.holdExpiresAt, now)
                    )
                );

            for (const hold of expiredHolds) {
                results.processed++;

                try {
                    await this.db.transaction(async (tx) => {
                        // Update status to cancelled
                        await tx
                            .update(reservationsTable)
                            .set({
                                status: 'cancelled',
                                cancelledAt: new Date(),
                                cancellationReason: 'Hold expired',
                                updatedAt: new Date(),
                            })
                            .where(eq(reservationsTable.id, hold.id));

                        // Log expiration event
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
                                    reason: 'Automatic expiry by cleanup service',
                                },
                            }
                        );
                    });

                    results.released++;
                } catch (error) {
                    console.error(`Failed to release expired hold ${hold.id}:`, error);
                    results.errors++;
                }
            }

            console.log('Hold cleanup results:', results);
            return results;
        } catch (error) {
            console.error('Error during hold cleanup:', error);
            throw error;
        }
    }

    /**
     * Run all cleanup tasks
     */
    async runAllCleanupTasks() {
        console.log('Starting reservation cleanup tasks...');

        const results = {
            failedPayments: await this.cleanupFailedPayments(),
            expiredHolds: await this.cleanupExpiredHolds(),
        };

        console.log('Cleanup tasks completed:', results);
        return results;
    }

    private async cancelFailedReservation(reservation: any) {
        await this.db.transaction(async (tx) => {
            // Update reservation status
            await tx
                .update(reservationsTable)
                .set({
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancellationReason: 'Payment setup failed - automatic cleanup',
                    updatedAt: new Date(),
                })
                .where(eq(reservationsTable.id, reservation.id));

            // Log cancellation event
            await this.eventService.logEvent(
                reservation.id,
                'cancelled',
                {
                    reason: 'Payment setup failed',
                    cleanupType: 'automatic',
                    minutesSinceCreation: Math.floor((Date.now() - new Date(reservation.createdAt).getTime()) / (60 * 1000)),
                },
                {
                    userId: reservation.userId,
                    source: 'system',
                    metadata: {
                        originalStatus: reservation.status,
                        paymentStatus: reservation.paymentStatus,
                    },
                }
            );

            // Cancel payment intent if exists
            if (reservation.paymentIntentId) {
                try {
                    await this.paymentService.cancelPayment(reservation.paymentIntentId);
                } catch (error) {
                    // Log but don't fail the transaction
                    console.error(`Failed to cancel payment intent ${reservation.paymentIntentId}:`, error);
                }
            }
        });
    }
}