import { sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { experienceTimeSlotsTable, reservationsTable } from "@/database/schemas";

// Type for time slot row from database
interface TimeSlotRow {
    id: string;
    experience_id: string;
    availability_id: string;
    slot_datetime: Date;
    local_date: Date;
    local_time: string;
    max_capacity: number;
    booked_count: number;
    status: string;
    created_at: Date;
    updated_at: Date;
}

export class TimeSlotsLockingQueryManager {
    /**
     * Get a time slot with pessimistic locking using SELECT FOR UPDATE
     * This is the industry standard for preventing race conditions in reservation systems
     * Must be called within a transaction
     */
    public async getByIdWithLockAndBookedCount(
        tx: NodePgDatabase,
        timeSlotId: string,
        includeHeld: boolean = false
    ): Promise<(TimeSlotRow & { bookedCount: number }) | null> {
        // Use raw SQL for SELECT FOR UPDATE as it's the industry standard
        // This locks the row until the transaction completes
        const timeSlotResult = await tx.execute(sql`
            SELECT * FROM ${experienceTimeSlotsTable}
            WHERE id = ${timeSlotId}
            FOR UPDATE
        `);
        
        const timeSlot = timeSlotResult.rows[0] as TimeSlotRow | undefined;

        if (!timeSlot) {
            return null;
        }

        // Calculate the current booked count
        // Include different reservation statuses based on the includeHeld parameter
        const statusFilter = includeHeld 
            ? sql`status IN ('held', 'pending', 'confirmed')`
            : sql`status IN ('pending', 'confirmed')`;
            
        const bookingResult = await tx.execute(sql`
            SELECT COALESCE(SUM(number_of_guests), 0) as total_guests
            FROM ${reservationsTable}
            WHERE time_slot_id = ${timeSlotId}
            AND ${statusFilter}
        `);
        
        const bookedCount = Number(bookingResult.rows[0]?.total_guests || 0);

        return {
            ...timeSlot,
            bookedCount,
        };
    }

    /**
     * Check and reserve capacity atomically
     * Returns true if the reservation was successful, false if there's not enough capacity
     */
    public async checkAndReserveCapacity(
        tx: NodePgDatabase,
        timeSlotId: string,
        numberOfGuests: number,
        includeHeld: boolean = false
    ): Promise<{ success: boolean; timeSlot: any; reason?: string }> {
        // Lock and get the time slot with current booked count
        const timeSlotWithCount = await this.getByIdWithLockAndBookedCount(tx, timeSlotId, includeHeld);
        
        if (!timeSlotWithCount) {
            return { success: false, timeSlot: null, reason: 'TIME_SLOT_NOT_FOUND' };
        }

        if (timeSlotWithCount.status !== 'available') {
            return { success: false, timeSlot: timeSlotWithCount, reason: 'TIME_SLOT_NOT_AVAILABLE' };
        }

        const remainingCapacity = timeSlotWithCount.max_capacity - timeSlotWithCount.bookedCount;
        
        if (remainingCapacity < numberOfGuests) {
            return { 
                success: false, 
                timeSlot: timeSlotWithCount, 
                reason: 'NOT_ENOUGH_CAPACITY',
            };
        }

        // If we get here, there's enough capacity and the row is locked
        return { success: true, timeSlot: timeSlotWithCount };
    }
}

export const timeSlotsLockingQueryManager = new TimeSlotsLockingQueryManager();