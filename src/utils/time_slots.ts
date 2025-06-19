import dayjs from "dayjs";

import Postgres from "@/database/postgres";

export async function generateTimeSlotsFromAvailability(
    db: Postgres,
    opts: {
        experienceId: string;
        availabilityId: string;
        availability: {
            startDate: Date;
            endDate?: Date;
            daysOfWeek: number[];
            timeSlots: string[];
            maxCapacity: number;
        };
        timezone: string;
    },
    generateMonthsAhead: number = 1
) {
    const { experienceId, availabilityId, availability, timezone } = opts;

    const timeSlotsToCreate = [];

    let current = dayjs(availability.startDate).tz(timezone);
    const end = generateMonthsAhead
        ? current.add(generateMonthsAhead, "month")
        : dayjs(availability.endDate).tz(timezone);

    while (current.isBefore(end) || current.isSame(end, "day")) {
        const dayOfWeek = current.day();

        if (availability.daysOfWeek.includes(dayOfWeek)) {
            for (const timeSlot of availability.timeSlots) {
                const [hours, minutes] = timeSlot.split(":").map(Number);

                const localDateTime = current
                    .hour(hours)
                    .minute(minutes)
                    .second(0)
                    .millisecond(0);

                timeSlotsToCreate.push({
                    experienceId,
                    availabilityId,
                    slotDateTime: localDateTime.toDate(),
                    localDate: current.startOf("day").toDate(),
                    localTime: timeSlot,
                    maxCapacity: availability.maxCapacity,
                    bookedCount: 0,
                    status: "available",
                });
            }
        }

        current = current.add(1, "day");
    }

    if (timeSlotsToCreate.length > 0) {
        await db.timeSlots.createTimeSlots(timeSlotsToCreate);
    }

    return timeSlotsToCreate.length;
}
