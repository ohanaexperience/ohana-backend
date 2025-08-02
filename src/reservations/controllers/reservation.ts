import { ReservationService } from "../services/reservation";
import { ReservationEventService } from "../services/event";
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
    private readonly db: any;

    constructor(opts: ReservationServiceOptions) {
        this.reservationService = new ReservationService(opts);
        this.eventService = new ReservationEventService(opts.database);
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
}
