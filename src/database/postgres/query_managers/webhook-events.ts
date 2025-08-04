import { eq, sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { webhookEventsTable } from "@/database/schemas";

export class WebhookEventQueryManager {
    private getDb: () => NodePgDatabase;
    private connectDb: () => Promise<void>;

    constructor(
        getDb: () => NodePgDatabase,
        connectDb: () => Promise<void>
    ) {
        this.getDb = getDb;
        this.connectDb = connectDb;
    }

    async create(data: {
        stripeEventId: string;
        eventType: string;
        eventData?: any;
        webhookEndpoint: string;
        apiVersion?: string;
    }) {
        await this.connectDb();
        const db = this.getDb();
        
        const [event] = await db
            .insert(webhookEventsTable)
            .values(data)
            .returning();
        return event;
    }

    async getByStripeEventId(stripeEventId: string) {
        await this.connectDb();
        const db = this.getDb();
        
        const [event] = await db
            .select()
            .from(webhookEventsTable)
            .where(eq(webhookEventsTable.stripeEventId, stripeEventId));
        return event || null;
    }

    async recordError(
        stripeEventId: string,
        error: {
            errorMessage: string;
            errorCode?: string;
        }
    ) {
        await this.connectDb();
        const db = this.getDb();
        
        const [event] = await db
            .update(webhookEventsTable)
            .set({
                errorMessage: error.errorMessage,
                errorCode: error.errorCode,
                retryCount: sql`${webhookEventsTable.retryCount} + 1`,
            })
            .where(eq(webhookEventsTable.stripeEventId, stripeEventId))
            .returning();
        return event;
    }

    async updateProcessingDuration(
        stripeEventId: string,
        durationMs: number
    ) {
        await this.connectDb();
        const db = this.getDb();
        
        const [event] = await db
            .update(webhookEventsTable)
            .set({
                processingDurationMs: durationMs,
            })
            .where(eq(webhookEventsTable.stripeEventId, stripeEventId))
            .returning();
        return event;
    }
}

export const webhookEventQueryManager = new WebhookEventQueryManager(
    () => { throw new Error("WebhookEventQueryManager not initialized with database instance") },
    async () => { throw new Error("WebhookEventQueryManager not initialized with database instance") }
);