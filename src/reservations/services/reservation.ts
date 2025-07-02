import crypto from "crypto";
import dayjs from "dayjs";

import { CreateReservationRequest } from "../validations";
import { ReservationServiceOptions } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";

// Types for discount calculations
interface DiscountResult {
    amount: number;
    type: string | null;
}

interface Experience {
    pricePerPerson: number;
    groupDiscountsEnabled: boolean | null;
    discountPercentageFor3Plus?: number | null;
    discountPercentageFor5Plus?: number | null;
    earlyBirdEnabled: boolean | null;
    earlyBirdDiscountPercentage?: number | null;
    earlyBirdDaysInAdvance?: number | null;
}

interface TimeSlot {
    id: string;
    slotDateTime: Date;
    bookedCount: number;
    maxCapacity: number;
    status: string | null;
}

export class ReservationService {
    private readonly db: Postgres;

    constructor({ database }: ReservationServiceOptions) {
        this.db = database;
    }

    async createReservation(request: CreateReservationRequest) {
        const { authorization, experienceId, timeSlotId, numberOfGuests } =
            request;

        const { sub: userId } = decodeToken(authorization);

        const timeSlot = await this.db.timeSlots.getById(timeSlotId);

        if (!timeSlot) {
            throw new Error(ERRORS.TIME_SLOT.NOT_FOUND.CODE);
        }

        if (timeSlot.status !== "available") {
            throw new Error(ERRORS.TIME_SLOT.NOT_AVAILABLE.CODE);
        }

        if (timeSlot.bookedCount + numberOfGuests > timeSlot.maxCapacity) {
            throw new Error(ERRORS.TIME_SLOT.NOT_ENOUGH_CAPACITY.CODE);
        }

        const experience = await this.db.experiences.getById(experienceId);

        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        const basePrice = experience.pricePerPerson * numberOfGuests;

        // Calculate both discounts independently
        const groupDiscount = this.calculateGroupDiscount(
            experience,
            numberOfGuests,
            basePrice
        );
        const earlyBirdDiscount = this.calculateEarlyBirdDiscount(
            experience,
            timeSlot,
            basePrice
        );

        // Apply both discounts if applicable
        const totalDiscountAmount =
            groupDiscount.amount + earlyBirdDiscount.amount;

        // Determine discount type string
        let discountType = null;
        if (groupDiscount.type && earlyBirdDiscount.type) {
            discountType = `${groupDiscount.type},${earlyBirdDiscount.type}`;
        } else if (groupDiscount.type) {
            discountType = groupDiscount.type;
        } else if (earlyBirdDiscount.type) {
            discountType = earlyBirdDiscount.type;
        }

        const totalPrice = basePrice - totalDiscountAmount;

        // TODO: Implement payment processing

        const reservationReference = this.generateReservationReference();

        const reservation = await this.db.reservations.create({
            userId,
            experienceId,
            timeSlotId,
            numberOfGuests,
            totalPrice,
            originalPrice: basePrice,
            discountApplied: totalDiscountAmount,
            discountType,
            reservationReference,
            guestName: "temp",
            guestEmail: "temp@gmail.com",
            paymentStatus: "success",
        });

        await this.db.timeSlots.updateBookedCount(
            timeSlotId,
            timeSlot.bookedCount + numberOfGuests
        );

        return {
            reservation,
            appliedDiscounts: {
                groupDiscount,
                earlyBirdDiscount,
                totalDiscount: totalDiscountAmount,
            },
        };
    }

    private generateReservationReference(): string {
        const bytes = crypto.randomBytes(12);

        return bytes.toString("hex").toUpperCase().slice(0, 12);
    }

    private calculateGroupDiscount(
        experience: Experience,
        numberOfGuests: number,
        basePrice: number
    ): DiscountResult {
        if (!experience.groupDiscountsEnabled) {
            return {
                amount: 0,
                type: null,
            };
        }

        // Check for 5+ guest discount first (higher discount)
        if (numberOfGuests >= 5 && experience.discountPercentageFor5Plus) {
            const discountAmount = Math.round(
                basePrice * (experience.discountPercentageFor5Plus / 100)
            );
            return {
                amount: discountAmount,
                type: "group_5_plus",
            };
        }

        // Check for 3+ guest discount
        if (numberOfGuests >= 3 && experience.discountPercentageFor3Plus) {
            const discountAmount = Math.round(
                basePrice * (experience.discountPercentageFor3Plus / 100)
            );
            return {
                amount: discountAmount,
                type: "group_3_plus",
            };
        }

        return { amount: 0, type: null };
    }

    private calculateEarlyBirdDiscount(
        experience: Experience,
        timeSlot: TimeSlot,
        basePrice: number
    ): DiscountResult {
        if (
            !experience.earlyBirdEnabled ||
            !experience.earlyBirdDaysInAdvance ||
            !experience.earlyBirdDiscountPercentage
        ) {
            return { amount: 0, type: null };
        }

        const slotDate = dayjs(timeSlot.slotDateTime);
        const daysUntilExperience = slotDate.diff(dayjs(), "day");

        if (daysUntilExperience >= experience.earlyBirdDaysInAdvance) {
            const discountAmount = Math.round(
                basePrice * (experience.earlyBirdDiscountPercentage / 100)
            );
            return {
                amount: discountAmount,
                type: "early_bird",
            };
        }

        return { amount: 0, type: null };
    }
}
