import { TimeSlotOptions } from "../types";
import { TimeSlotSearchRequest } from "../validations";

import Postgres from "@/database/postgres";
import ERRORS from "@/errors";
import dayjs from "dayjs";

export class TimeSlotService {
    private readonly db: Postgres;

    constructor({ database }: TimeSlotOptions) {
        this.db = database;
    }

    async getAvailability(request: TimeSlotSearchRequest) {
        const { 
            userId, 
            experienceId, 
            startDate, 
            endDate, 
            date,
            timezone,
            partySize,
            limit = 50,
            offset = 0,
            view = 'detailed'
        } = request;

        const experience = await this.db.experiences.getById(experienceId);

        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        // If specific date requested, override date range
        const effectiveStartDate = date || startDate;
        const effectiveEndDate = date || endDate;

        // Handle different view modes
        switch (view) {
            case 'summary':
            case 'calendar':
                // Return aggregated data for calendar display
                return await this.db.timeSlots.getAvailabilitySummary({
                    experienceId,
                    startDate: effectiveStartDate!,
                    endDate: effectiveEndDate!,
                    timezone,
                });

            case 'detailed':
            default:
                // Get detailed timeslots with pagination
                return await this.db.timeSlots.getByDateRangePaginated({
                    experienceId,
                    startDate: effectiveStartDate,
                    endDate: effectiveEndDate,
                    partySize,
                    limit,
                    offset,
                    timezone,
                });
        }
    }

}
