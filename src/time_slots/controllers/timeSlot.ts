import { TimeSlotService } from "../services/timeSlot";
import { TimeSlotOptions } from "../types";
import { TimeSlotSearchRequest } from "../validations";

import ERRORS from "@/errors";

export class TimeSlotController {
    private readonly timeSlotService: TimeSlotService;

    constructor(opts: TimeSlotOptions) {
        this.timeSlotService = new TimeSlotService(opts);
    }

    async getAvailability(request: TimeSlotSearchRequest) {
        try {
            const result = await this.timeSlotService.getAvailability(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    private handleError(error: any) {
        console.log("TimeSlotController error:", error);

        switch (error.message) {
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
