import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Signer } from "@aws-sdk/rds-signer";
import Postgres from "./postgres";
import { PostgresConfig } from "./";
import { createDatabaseConfig } from "./proxy-config";

interface PooledConnection {
    pool: Pool;
    db: NodePgDatabase;
    lastUsed: number;
}

class ConnectionManager {
    private static instance: ConnectionManager;
    private pooledConnection: PooledConnection | null = null;
    private legacyConnection: Postgres | null = null;
    
    // Connection will be reused for 5 minutes in the same Lambda container
    private readonly CONNECTION_TTL = 5 * 60 * 1000; // 5 minutes
    
    private constructor() {}
    
    static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }
    
    /**
     * Get a pooled connection for non-production environments
     * or a legacy connection for production (which uses RDS Proxy)
     */
    async getConnection(config?: PostgresConfig): Promise<Postgres> {
        const dbConfig = config || createDatabaseConfig();
        const useRdsProxy = process.env.USE_RDS_PROXY === "true";
        
        // For production with RDS Proxy, use the legacy single connection approach
        if (useRdsProxy) {
            return this.getLegacyConnection(dbConfig);
        }
        
        // For dev/staging, use connection pooling
        return this.getPooledConnectionWrapper(dbConfig);
    }
    
    private async getLegacyConnection(config: PostgresConfig): Promise<Postgres> {
        const now = Date.now();
        
        // Reuse existing connection if valid
        if (
            this.legacyConnection &&
            now - (this.pooledConnection?.lastUsed || 0) < this.CONNECTION_TTL
        ) {
            return this.legacyConnection;
        }
        
        // Close old connection
        if (this.legacyConnection) {
            try {
                await this.legacyConnection.close();
            } catch (error) {
                console.error("Error closing old connection:", error);
            }
        }
        
        // Create new connection
        this.legacyConnection = new Postgres(config);
        await this.legacyConnection.connect();
        
        return this.legacyConnection;
    }
    
    private async getPooledConnectionWrapper(config: PostgresConfig): Promise<Postgres> {
        const now = Date.now();
        
        // Reuse existing pool if valid
        if (
            this.pooledConnection &&
            now - this.pooledConnection.lastUsed < this.CONNECTION_TTL
        ) {
            this.pooledConnection.lastUsed = now;
            // Return a wrapper that looks like the Postgres class
            return this.createPostgresWrapper(this.pooledConnection.db);
        }
        
        // Close old pool
        if (this.pooledConnection) {
            try {
                await this.pooledConnection.pool.end();
            } catch (error) {
                console.error("Error closing old pool:", error);
            }
        }
        
        // Create new pool
        const pool = await this.createPool(config);
        const db = drizzle(pool);
        
        this.pooledConnection = {
            pool,
            db,
            lastUsed: now
        };
        
        console.log("Database connection pool established successfully");
        
        return this.createPostgresWrapper(db);
    }
    
    private async createPool(config: PostgresConfig): Promise<Pool> {
        let password = config.password;
        
        // Handle IAM authentication if needed
        if (config.useIamAuth && config.region) {
            const signer = new Signer({
                region: config.region,
                hostname: config.host,
                port: config.port,
                username: config.user,
            });
            password = await signer.getAuthToken();
        }
        
        const pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password,
            ssl: config.ssl || { rejectUnauthorized: false },
            // Connection pool settings optimized for Lambda
            max: 1, // Max connections per Lambda container
            min: 0, // Allow pool to shrink to 0
            idleTimeoutMillis: 300000, // 5 minutes
            connectionTimeoutMillis: 30000, // 30 seconds
            // Keep alive to prevent idle connection drops
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
        });
        
        // Test the connection
        const client = await pool.connect();
        client.release();
        
        return pool;
    }
    
    /**
     * Create a wrapper that mimics the Postgres class interface
     * but uses the pooled connection underneath
     */
    private createPostgresWrapper(db: NodePgDatabase): Postgres {
        // Create a mock Postgres instance that uses the pooled db
        const wrapper = Object.create(Postgres.prototype);
        
        // Set the instance property that query managers use
        wrapper.instance = db;
        
        // Implement the required methods
        wrapper.connect = async () => {}; // No-op since pool handles this
        wrapper.close = async () => {}; // No-op, pool manages connections
        wrapper.transaction = async (fn: (tx: NodePgDatabase) => Promise<any>) => {
            return await db.transaction(fn);
        };
        
        // Copy over query manager getters from Postgres class
        const postgres = new Postgres({} as PostgresConfig);
        const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(postgres));
        
        Object.keys(descriptors).forEach(key => {
            if (descriptors[key].get && key !== 'instance') {
                Object.defineProperty(wrapper, key, {
                    get: function() {
                        // Initialize query managers with the pooled db
                        return descriptors[key].get!.call({
                            ...this,
                            getInstance: () => db,
                            connect: async () => {},
                        });
                    }
                });
            }
        });
        
        return wrapper;
    }
    
    // Close all connections (useful for testing)
    async closeAll(): Promise<void> {
        if (this.pooledConnection) {
            await this.pooledConnection.pool.end();
            this.pooledConnection = null;
        }
        
        if (this.legacyConnection) {
            await this.legacyConnection.close();
            this.legacyConnection = null;
        }
    }
}

export default ConnectionManager;