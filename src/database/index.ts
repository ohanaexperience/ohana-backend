import Postgres from "./postgres";

export type PostgresConfig = {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
};

export interface DatabaseConfig {
    postgres: PostgresConfig;
}

export class DatabaseFactory {
    static create(config: DatabaseConfig) {
        if (config.postgres) {
            return new Postgres(config.postgres);
        }

        throw new Error("Invalid database config");
    }
}
