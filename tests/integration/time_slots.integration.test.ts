import { expect } from "chai";
import { experienceTimeSlotsTable } from "@/database/schemas";
import { TimeSlotService } from "@/time_slots/services/timeSlot";
import { experienceQueryManager } from "@/database/postgres/query_managers";
import { ExperienceFactory } from "@test-helpers/experience-factory";
import { setupIntegrationTest } from "@test-helpers/integration-setup";
import { generateId } from "@test-helpers/helpers";
import dayjs from "dayjs";

describe("TimeSlots Integration Tests", function () {
    let testDb: any;
    let testData: any;
    let timeSlotService: TimeSlotService;

    before(async function () {
        ({ db: testDb, testData } = await setupIntegrationTest());
        timeSlotService = new TimeSlotService({ database: testDb });
    });

    describe("getTimeSlots", () => {
        it("should return timeslots with pagination", async () => {
            const experience = await ExperienceFactory.create(testDb, {
                hostId: testData.host.id,
            });

            // Create 20 timeslots
            const timeslots = [];
            for (let i = 0; i < 20; i++) {
                timeslots.push({
                    id: generateId(),
                    experienceId: experience.id,
                    availabilityId: generateId(),
                    slotDateTime: dayjs().add(i, 'hour').toDate(),
                    localDate: dayjs().add(Math.floor(i / 8), 'day').toDate(),
                    localTime: `${(i % 24).toString().padStart(2, '0')}:00`,
                    maxCapacity: 10,
                    bookedCount: 0,
                    status: 'available',
                });
            }

            await testDb.insert(experienceTimeSlotsTable).values(timeslots);

            const result = await timeSlotService.getTimeSlots({
                authorization: `Bearer ${testData.user.token}`,
                experienceId: experience.id,
                limit: 10,
                offset: 0,
            });

            expect(result.timeslots).to.have.lengthOf(10);
            expect(result.pagination.total).to.equal(20);
            expect(result.pagination.hasMore).to.be.true;
        });

        it("should filter by party size", async () => {
            const experience = await ExperienceFactory.create(testDb, {
                hostId: testData.host.id,
            });

            // Create timeslots with different capacities
            const timeslots = [
                {
                    id: generateId(),
                    experienceId: experience.id,
                    availabilityId: generateId(),
                    slotDateTime: dayjs().add(1, 'hour').toDate(),
                    localDate: dayjs().toDate(),
                    localTime: '14:00',
                    maxCapacity: 5,
                    bookedCount: 3, // Only 2 spots left
                    status: 'available',
                },
                {
                    id: generateId(),
                    experienceId: experience.id,
                    availabilityId: generateId(),
                    slotDateTime: dayjs().add(2, 'hour').toDate(),
                    localDate: dayjs().toDate(),
                    localTime: '15:00',
                    maxCapacity: 10,
                    bookedCount: 2, // 8 spots left
                    status: 'available',
                },
            ];

            await testDb.insert(experienceTimeSlotsTable).values(timeslots);

            const result = await timeSlotService.getTimeSlots({
                authorization: `Bearer ${testData.user.token}`,
                experienceId: experience.id,
                partySize: 5,
                limit: 10,
                offset: 0,
            });

            expect(result.timeslots).to.have.lengthOf(1);
            expect(result.timeslots[0].localTime).to.equal('15:00');
        });

        it("should return summary when requested", async () => {
            const experience = await ExperienceFactory.create(testDb, {
                hostId: testData.host.id,
            });

            const startDate = dayjs().format('YYYY-MM-DD');
            const endDate = dayjs().add(7, 'day').format('YYYY-MM-DD');

            // Create timeslots for multiple days
            const timeslots = [];
            for (let day = 0; day < 7; day++) {
                for (let hour = 0; hour < 4; hour++) {
                    timeslots.push({
                        id: generateId(),
                        experienceId: experience.id,
                        availabilityId: generateId(),
                        slotDateTime: dayjs().add(day, 'day').hour(14 + hour).toDate(),
                        localDate: dayjs().add(day, 'day').toDate(),
                        localTime: `${14 + hour}:00`,
                        maxCapacity: 10,
                        bookedCount: hour * 2, // Vary booked count
                        status: 'available',
                    });
                }
            }

            await testDb.insert(experienceTimeSlotsTable).values(timeslots);

            const result = await timeSlotService.getTimeSlots({
                authorization: `Bearer ${testData.user.token}`,
                experienceId: experience.id,
                startDate,
                endDate,
                summary: true,
                limit: 50,
                offset: 0,
            });

            expect(result.dates).to.have.lengthOf(7);
            expect(result.dates[0]).to.have.property('available');
            expect(result.dates[0]).to.have.property('slotsAvailable');
            expect(result.dates[0]).to.have.property('totalSlots');
            expect(result.dates[0]).to.have.property('remainingCapacity');
        });
    });

    describe("getAvailabilitySummary", () => {
        it("should return aggregated availability data", async () => {
            const experience = await ExperienceFactory.create(testDb, {
                hostId: testData.host.id,
            });

            const startDate = dayjs().format('YYYY-MM-DD');
            const endDate = dayjs().add(3, 'day').format('YYYY-MM-DD');

            // Create timeslots
            const timeslots = [];
            for (let day = 0; day < 4; day++) {
                for (let hour = 0; hour < 3; hour++) {
                    timeslots.push({
                        id: generateId(),
                        experienceId: experience.id,
                        availabilityId: generateId(),
                        slotDateTime: dayjs().add(day, 'day').hour(10 + hour).toDate(),
                        localDate: dayjs().add(day, 'day').toDate(),
                        localTime: `${10 + hour}:00`,
                        maxCapacity: 8,
                        bookedCount: day === 0 ? 8 : hour * 2, // First day fully booked
                        status: 'available',
                    });
                }
            }

            await testDb.insert(experienceTimeSlotsTable).values(timeslots);

            const result = await timeSlotService.getAvailabilitySummary({
                authorization: `Bearer ${testData.user.token}`,
                experienceId: experience.id,
                startDate,
                endDate,
                timezone: 'UTC',
            });

            expect(result.dates).to.have.lengthOf(4);
            expect(result.dates[0].available).to.be.false; // First day fully booked
            expect(result.dates[1].available).to.be.true;
            expect(result.dates[0].totalSlots).to.equal(3);
        });
    });
});