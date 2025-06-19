import { DatabaseService } from "../services/database";
import Postgres from "@/database/postgres";

export class DatabaseController {
    private readonly databaseService: DatabaseService;

    constructor(database: Postgres) {
        this.databaseService = new DatabaseService(database);
    }

    async runMigrations() {
        try {
            await this.databaseService.runMigrations();

            return {
                statusCode: 200,
                body: JSON.stringify({}),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async clearDatabase() {
        try {
            await this.databaseService.clearDatabase();

            return {
                statusCode: 200,
                body: JSON.stringify({}),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async testDatabase() {
        try {
            const result = await this.databaseService.testDatabase();

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async seedDatabase() {
        try {
            await this.databaseService.seedDatabase();

            return {
                statusCode: 200,
                body: JSON.stringify({}),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    private handleError(error: any) {
        switch (error.message) {
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
