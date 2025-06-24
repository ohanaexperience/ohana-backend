import { ReservationService } from "../services/reservation";
import { CreateReservationRequest } from "../validations";
import { ReservationServiceOptions } from "../types";

import ERRORS from "@/errors";

export class ReservationController {
    private readonly reservationService: ReservationService;

    constructor(opts: ReservationServiceOptions) {
        this.reservationService = new ReservationService(opts);
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

    private handleError(error: any) {
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
