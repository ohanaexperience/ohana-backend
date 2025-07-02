import { TimeSlotOptions } from "../types";
import { TimeSlotSearchRequest } from "../validations";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";

export class TimeSlotService {
    private readonly db: Postgres;

    constructor({ database }: TimeSlotOptions) {
        this.db = database;
    }

    async getTimeSlots(request: TimeSlotSearchRequest) {
        const { authorization, experienceId, startDate, endDate } = request;

        const { sub } = decodeToken(authorization);

        console.log("sub", sub);

        const experience = await this.db.experiences.getById(experienceId);

        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        return await this.db.timeSlots.getByDateRange({
            experienceId,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        });
    }
}
