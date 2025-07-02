import Postgres from "./postgres";

export type PostgresConfig = {
    host: string;
    port: number;
    database: string;
    user: string;
    password?: string;
    ssl: boolean | { rejectUnauthorized: boolean };
    useIamAuth?: boolean;
    region?: string;
    useRdsProxy?: boolean;
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
