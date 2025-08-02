import { ReservationEventType } from "@/database/postgres/query_managers/reservation-events";
import Postgres from "@/database/postgres";

interface EventContext {
    userId?: string;
    source: 'api' | 'webhook' | 'admin' | 'system';
    metadata?: Record<string, any>;
}

export class ReservationEventService {
    private readonly db: Postgres;

    constructor(database: Postgres) {
        this.db = database;
    }

    async logEvent(
        reservationId: string,
        eventType: ReservationEventType,
        eventData: Record<string, any>,
        context: EventContext
    ) {
        return await this.db.reservationEvents.create({
            reservationId,
            eventType,
            eventData,
            userId: context.userId,
            source: context.source,
            metadata: context.metadata,
        });
    }

    async logReservationCreated(
        reservationId: string,
        data: {
            experienceId: string;
            timeSlotId: string;
            numberOfGuests: number;
            totalPrice: number;
            discountApplied?: number;
            idempotencyKey: string;
        },
        context: EventContext
    ) {
        return this.logEvent(reservationId, 'created', data, context);
    }

    async logPaymentInitiated(
        reservationId: string,
        data: {
            paymentIntentId: string;
            amount: number;
            currency: string;
        },
        context: EventContext
    ) {
        return this.logEvent(reservationId, 'payment_initiated', data, context);
    }

    async logPaymentCaptured(
        reservationId: string,
        data: {
            paymentIntentId: string;
            chargeId: string;
            amount: number;
        },
        context: EventContext
    ) {
        return this.logEvent(reservationId, 'payment_captured', data, context);
    }

    async logPaymentFailed(
        reservationId: string,
        data: {
            paymentIntentId: string;
            errorCode?: string;
            errorMessage?: string;
        },
        context: EventContext
    ) {
        return this.logEvent(reservationId, 'payment_failed', data, context);
    }

    async logReservationConfirmed(
        reservationId: string,
        data: {
            paymentIntentId: string;
            confirmedAt: Date;
        },
        context: EventContext
    ) {
        return this.logEvent(reservationId, 'confirmed', data, context);
    }

    async logReservationCancelled(
        reservationId: string,
        data: {
            reason?: string;
            cancelledBy: string;
            refundInitiated?: boolean;
        },
        context: EventContext
    ) {
        return this.logEvent(reservationId, 'cancelled', data, context);
    }

    async logReservationRefunded(
        reservationId: string,
        data: {
            refundId: string;
            amount: number;
            reason?: string;
        },
        context: EventContext
    ) {
        return this.logEvent(reservationId, 'refunded', data, context);
    }

    async getReservationHistory(reservationId: string) {
        const events = await this.db.reservationEvents.getByReservationId(reservationId);
        
        return {
            reservationId,
            events: events.map(event => ({
                id: event.id,
                type: event.eventType,
                data: event.eventData,
                source: event.source,
                userId: event.userId,
                createdAt: event.createdAt,
                metadata: event.metadata,
            })),
            timeline: this.buildTimeline(events),
        };
    }

    private buildTimeline(events: any[]) {
        return events.map(event => {
            const time = new Date(event.createdAt).toISOString();
            let description = '';
            
            switch (event.eventType) {
                case 'created':
                    description = `Reservation created for ${event.eventData.numberOfGuests} guests`;
                    break;
                case 'payment_initiated':
                    description = `Payment initiated for ${event.eventData.currency} ${event.eventData.amount / 100}`;
                    break;
                case 'payment_captured':
                    description = 'Payment successfully captured';
                    break;
                case 'payment_failed':
                    description = `Payment failed: ${event.eventData.errorMessage || 'Unknown error'}`;
                    break;
                case 'confirmed':
                    description = 'Reservation confirmed';
                    break;
                case 'cancelled':
                    description = `Reservation cancelled${event.eventData.reason ? ': ' + event.eventData.reason : ''}`;
                    break;
                case 'refunded':
                    description = `Refunded ${event.eventData.amount / 100}`;
                    break;
                default:
                    description = event.eventType;
            }
            
            return {
                time,
                type: event.eventType,
                description,
                source: event.source,
                userId: event.userId,
            };
        });
    }
}