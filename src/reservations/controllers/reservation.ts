import { ReservationService } from "../services/reservation";
import { ReservationEventService } from "../services/event";
import { PaymentService } from "@/payments/services/payment";
import {
    CreateReservationRequest,
    ConfirmReservationRequest,
    CreateHoldRequest,
    ConvertHoldRequest,
} from "../validations";
import { ReservationServiceOptions } from "../types";

import ERRORS from "@/errors";
import { decodeToken } from "@/utils";

export class ReservationController {
    private readonly reservationService: ReservationService;
    private readonly eventService: ReservationEventService;
    private readonly paymentService: PaymentService;
    private readonly db: any;

    constructor(opts: ReservationServiceOptions) {
        this.reservationService = new ReservationService(opts);
        this.eventService = new ReservationEventService(opts.database);
        this.paymentService = new PaymentService(opts);
        this.db = opts.database;
    }

    async createReservation(request: CreateReservationRequest) {
        try {
            const result = await this.reservationService.createReservation(
                request
            );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async confirmReservation(request: ConfirmReservationRequest) {
        try {
            const result = await this.reservationService.confirmReservation(
                request.reservationId,
                request.paymentIntentId
            );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async createHold(request: CreateHoldRequest) {
        try {
            const result = await this.reservationService.createHold(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async convertHoldToReservation(request: ConvertHoldRequest) {
        try {
            const result =
                await this.reservationService.convertHoldToReservation(
                    request.holdId,
                    request.paymentIntentId,
                    request.paymentMethodId,
                    request.savePaymentMethod
                );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async getReservationHistory(request: {
        authorization: string;
        reservationId: string;
    }) {
        try {
            const { sub: userId } = decodeToken(request.authorization);

            // Verify user owns this reservation
            const reservation = await this.db.reservations.getById(
                request.reservationId
            );
            if (!reservation || reservation.userId !== userId) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: "RESERVATION_NOT_FOUND",
                        message: "Reservation not found",
                    }),
                };
            }

            const result = await this.eventService.getReservationHistory(
                request.reservationId
            );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async getPaymentStatus(request: {
        userId: string;
        reservationId: string;
    }) {
        try {
            // Verify user owns this reservation
            const reservation = await this.db.reservations.getById(
                request.reservationId
            );
            
            if (!reservation || reservation.userId !== request.userId) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        success: false,
                        error: "RESERVATION_NOT_FOUND",
                        message: "Reservation not found",
                    }),
                };
            }

            let paymentStatus = {
                reservationStatus: reservation.status,
                paymentIntentId: reservation.paymentIntentId,
                requiresAction: false,
                actionType: null as string | null,
            };

            // Get payment details if payment intent exists
            if (reservation.paymentIntentId) {
                try {
                    // Use the new method that doesn't expose secrets
                    const stripeStatus = await this.paymentService.getPaymentIntentStatus(
                        reservation.paymentIntentId
                    );

                    paymentStatus = {
                        ...paymentStatus,
                        stripeStatus: stripeStatus.status,
                        requiresAction: stripeStatus.requiresAction,
                        actionType: this.getActionType(stripeStatus.status),
                        paymentMethod: stripeStatus.paymentMethod,
                        lastError: stripeStatus.lastError,
                    };

                    // Update local database if status changed
                    const payment = await this.db.payments.getByPaymentIntentId(
                        reservation.paymentIntentId
                    );
                    
                    if (payment) {
                        paymentStatus.paymentStatus = payment.status;
                    }
                } catch (error) {
                    console.error('Failed to get payment intent status:', error);
                    // Still return reservation status even if Stripe check fails
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: paymentStatus,
                }),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    private getActionType(stripeStatus: string): string | null {
        switch (stripeStatus) {
            case 'requires_payment_method':
                return 'add_payment_method';
            case 'requires_confirmation':
                return 'confirm_payment';
            case 'requires_action':
                return 'authenticate_payment';
            default:
                return null;
        }
    }

    private handleError(error: any) {
        console.log("ReservationController error:", error);

        switch (error.message) {
            case ERRORS.TIME_SLOT.NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.TIME_SLOT.NOT_FOUND.CODE,
                        message: ERRORS.TIME_SLOT.NOT_FOUND.MESSAGE,
                    }),
                };

            case ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE,
                        message: ERRORS.TIME_SLOT.NOT_AVAILABLE.MESSAGE,
                    }),
                };

            case ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.CODE,
                        message: ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.NOT_FOUND.CODE,
                        message: ERRORS.EXPERIENCE.NOT_FOUND.MESSAGE,
                    }),
                };

            case "INVALID_HOLD_STATUS":
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: "INVALID_HOLD_STATUS",
                        message: "This reservation is not in a held status",
                    }),
                };

            case "HOLD_EXPIRED":
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: "HOLD_EXPIRED",
                        message: "The hold on this reservation has expired",
                    }),
                };

            default:
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "Internal server error",
                        message: "An unexpected error occurred",
                    }),
                };
        }
    }

    async getUserReservations(request: {
        userId: string;
        status?: string;
        limit?: string;
        offset?: string;
    }) {
        try {
            const filters = {
                status: request.status,
                limit: request.limit ? parseInt(request.limit, 10) : undefined,
                offset: request.offset ? parseInt(request.offset, 10) : undefined,
            };
            
            const result = await this.reservationService.getUserReservations(
                request.userId,
                filters
            );
            
            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (error) {
            return this.handleError(error);
        }
    }
}
