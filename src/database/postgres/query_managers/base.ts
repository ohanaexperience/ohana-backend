import { NodePgDatabase } from "drizzle-orm/node-postgres";

export abstract class BaseQueryManager {
    protected getDatabase: () => NodePgDatabase;
    private ensureConnection: () => Promise<void>;

    constructor(
        getDatabase: () => NodePgDatabase,
        ensureConnection: () => Promise<void>
    ) {
        this.getDatabase = getDatabase;
        this.ensureConnection = ensureConnection;
    }

    protected async withDatabase<T>(
        operation: (db: NodePgDatabase) => Promise<T>
    ): Promise<T> {
        await this.ensureConnection();
        const db = this.getDatabase();
        return await operation(db);
    }
}
