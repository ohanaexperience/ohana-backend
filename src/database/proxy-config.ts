import { PostgresConfig } from "./";

export interface RDSProxyConfig {
    endpoint: string;
    port: number;
    database: string;
    username: string;
    region: string;
}

export function createProxyConfig(): PostgresConfig {
    // Construct the proxy endpoint from the service and stage
    const service = process.env.SERVICE || "ohana";
    const stage = process.env.NODE_ENV || "production";
    const region = process.env.AWS_REGION || "us-east-1";
    const accountId = process.env.AWS_ACCOUNT_ID;
    
    // The RDS Proxy endpoint follows a predictable pattern
    const proxyEndpoint = process.env.RDS_PROXY_ENDPOINT || 
        `${service}-${stage}-postgres-proxy.proxy-${accountId || "unknown"}.${region}.rds.amazonaws.com`;
    
    const database = process.env.POSTGRES_DB || process.env.DB_NAME;
    const username = process.env.POSTGRES_USERNAME || process.env.DB_USER;

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

    console.log(`Using RDS Proxy endpoint: ${proxyEndpoint}`);

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

    // In Lambda environment with RDS
    if (process.env.RDS_CLUSTER_ENDPOINT) {
        if (useProxy) {
            console.log("Using RDS Proxy configuration");
            return createProxyConfig();
        } else {
            console.log("Using direct RDS cluster configuration");
            return createRDSDirectConfig();
        }
    } 
    // Local development environment
    else {
        console.log("Using direct database configuration");
        return createDirectConfig();
    }
}

export function createRDSDirectConfig(): PostgresConfig {
    const host = process.env.RDS_CLUSTER_ENDPOINT;
    const port = parseInt(process.env.RDS_CLUSTER_PORT || "5432");
    const database = process.env.POSTGRES_DB || process.env.DB_NAME;
    const username = process.env.POSTGRES_USERNAME || process.env.DB_USER;
    const password = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD;
    const region = process.env.AWS_REGION || "us-east-1";

    if (!host || !database || !username) {
        throw new Error("Missing required RDS cluster configuration");
    }

    return {
        host,
        port,
        database,
        user: username,
        password,
        ssl: false,  // Disable SSL for direct connections in dev/staging
        useIamAuth: false,  // Direct connections use password auth
        region,
        useRdsProxy: false,
    };
}
