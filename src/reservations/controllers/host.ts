import { ReservationService } from "../services/reservation";
import { CompleteReservationInput, completeReservationSchema } from "../validations";
import { ReservationServiceOptions } from "../types";
import ERRORS from "@/errors";
import { decodeToken } from "@/utils";

export class HostReservationController {
    private readonly reservationService: ReservationService;

    constructor(opts: ReservationServiceOptions) {
        this.reservationService = new ReservationService(opts);
    }

    async completeReservation(request: {
        authorization: string;
        reservationId: string;
        body: CompleteReservationInput;
    }) {
        try {
            // Decode token to get host ID
            const { sub: hostId } = decodeToken(request.authorization);

            // Validate input
            const validatedInput = completeReservationSchema.parse({
                reservationId: request.reservationId,
                ...request.body,
            });

            // Complete the reservation
            const result = await this.reservationService.completeReservation(
                validatedInput.reservationId,
                hostId,
                {
                    actualAttendance: validatedInput.actualAttendance,
                    hostNotes: validatedInput.hostNotes,
                    incidentReport: validatedInput.incidentReport,
                    noShow: validatedInput.noShow,
                }
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    reservation: result,
                    message: "Reservation completed successfully",
                }),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async getHostReservations(request: {
        authorization: string;
        queryParams?: {
            experienceId?: string;
            status?: string;
            fromDate?: string;
            toDate?: string;
            limit?: string;
            offset?: string;
        };
    }) {
        try {
            const { sub: hostId } = decodeToken(request.authorization);

            const result = await this.reservationService.getHostReservations(
                hostId,
                {
                    experienceId: request.queryParams?.experienceId,
                    status: request.queryParams?.status,
                    fromDate: request.queryParams?.fromDate,
                    toDate: request.queryParams?.toDate,
                    limit: request.queryParams?.limit ? parseInt(request.queryParams.limit) : 20,
                    offset: request.queryParams?.offset ? parseInt(request.queryParams.offset) : 0,
                }
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    ...result,
                    pagination: {
                        total: result.total,
                        limit: request.queryParams?.limit ? parseInt(request.queryParams.limit) : 20,
                        offset: request.queryParams?.offset ? parseInt(request.queryParams.offset) : 0,
                        hasMore: (request.queryParams?.offset ? parseInt(request.queryParams.offset) : 0) + 
                                (request.queryParams?.limit ? parseInt(request.queryParams.limit) : 20) < result.total,
                    },
                }),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    private handleError(error: any) {
        console.log("HostReservationController error:", error);

        // Handle Zod validation errors
        if (error.name === "ZodError") {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "VALIDATION_ERROR",
                    message: "Invalid input data",
                    details: error.errors,
                }),
            };
        }

        // Handle specific reservation errors
        switch (error.message) {
            case ERRORS.RESERVATIONS.NOT_FOUND.CODE:
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: ERRORS.RESERVATIONS.NOT_FOUND.CODE,
                        message: ERRORS.RESERVATIONS.NOT_FOUND.MESSAGE,
                    }),
                };

            case ERRORS.RESERVATIONS.FORBIDDEN_COMPLETE.CODE:
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: ERRORS.RESERVATIONS.FORBIDDEN_COMPLETE.CODE,
                        message: ERRORS.RESERVATIONS.FORBIDDEN_COMPLETE.MESSAGE,
                    }),
                };

            case ERRORS.RESERVATIONS.INVALID_STATUS_TRANSITION.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.RESERVATIONS.INVALID_STATUS_TRANSITION.CODE,
                        message: ERRORS.RESERVATIONS.INVALID_STATUS_TRANSITION.MESSAGE,
                    }),
                };

            case ERRORS.RESERVATIONS.EXPERIENCE_NOT_STARTED.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.RESERVATIONS.EXPERIENCE_NOT_STARTED.CODE,
                        message: ERRORS.RESERVATIONS.EXPERIENCE_NOT_STARTED.MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE:
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE,
                        message: "You do not have permission to view reservations for this experience",
                    }),
                };

            default:
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "INTERNAL_SERVER_ERROR",
                        message: "An unexpected error occurred",
                    }),
                };
        }
    }
}