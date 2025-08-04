import { sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Helper functions for database transactions following industry best practices
 */
export class TransactionHelper {
    /**
     * Execute a transaction with SERIALIZABLE isolation level
     * This is the strongest isolation level and prevents all concurrency anomalies
     * Recommended for financial and reservation systems
     */
    static async withSerializableTransaction<T>(
        db: any, // Postgres instance
        callback: (tx: NodePgDatabase) => Promise<T>
    ): Promise<T> {
        return await db.transaction(async (tx: NodePgDatabase) => {
            // Set isolation level to SERIALIZABLE for maximum consistency
            await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
            return await callback(tx);
        });
    }

    /**
     * Execute a transaction with REPEATABLE READ isolation level
     * Good balance between consistency and performance for most use cases
     */
    static async withRepeatableReadTransaction<T>(
        db: any, // Postgres instance
        callback: (tx: NodePgDatabase) => Promise<T>
    ): Promise<T> {
        return await db.transaction(async (tx: NodePgDatabase) => {
            // Set isolation level to REPEATABLE READ
            await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
            return await callback(tx);
        });
    }
}