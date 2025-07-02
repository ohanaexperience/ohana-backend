import { PostgresConfig } from "./";

export interface RDSProxyConfig {
    endpoint: string;
    port: number;
    database: string;
    username: string;
    region: string;
}

export function createProxyConfig(): PostgresConfig {
    const proxyEndpoint = process.env.RDS_PROXY_ENDPOINT;
    const database = process.env.POSTGRES_DB || process.env.DB_NAME;
    const username = process.env.POSTGRES_USERNAME || process.env.DB_USER;
    const region = process.env.AWS_REGION || "us-east-1";

    if (!proxyEndpoint) {
        throw new Error("RDS_PROXY_ENDPOINT environment variable is required");
    }

    if (!database) {
        throw new Error(
            "POSTGRES_DB or DB_NAME environment variable is required"
        );
    }

    if (!username) {
        throw new Error(
            "POSTGRES_USERNAME or DB_USER environment variable is required"
        );
    }

    return {
        host: proxyEndpoint,
        port: 5432,
        database,
        user: username,
        ssl: true,
        useIamAuth: true,
        region,
        useRdsProxy: true,
    };
}

export function createDirectConfig(): PostgresConfig {
    const host = process.env.POSTGRES_HOST || process.env.DB_HOST;
    const port = parseInt(
        process.env.POSTGRES_PORT || process.env.DB_PORT || "5432"
    );
    const database = process.env.POSTGRES_DB || process.env.DB_NAME;
    const user = process.env.POSTGRES_USERNAME || process.env.DB_USER;
    const password = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD;
    const ssl =
        process.env.POSTGRES_SSL === "true" || process.env.DB_SSL === "true";

    if (!host || !database || !user || !password) {
        throw new Error("Missing required database configuration");
    }

    return {
        host,
        port,
        database,
        user,
        password,
        ssl,
        useIamAuth: false,
        useRdsProxy: false,
    };
}

export function createDatabaseConfig(): PostgresConfig {
    const useProxy = process.env.USE_RDS_PROXY === "true";

    if (useProxy) {
        console.log("Using RDS Proxy configuration");
        return createProxyConfig();
    } else {
        console.log("Using direct database configuration");
        return createDirectConfig();
    }
}
