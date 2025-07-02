import { Client } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Signer } from "@aws-sdk/rds-signer";

import { PostgresConfig } from "../";

import {
    UsersQueryManager,
    HostVerificationsQueryManager,
    HostsQueryManager,
    ExperiencesQueryManager,
    CategoriesQueryManager,
    SubCategoriesQueryManager,
    TimeSlotsQueryManager,
    AvailabilityQueryManager,
    ReservationsQueryManager,
} from "./query_managers";

export default class Postgres {
    private client: Client;
    public instance: NodePgDatabase;
    private config: PostgresConfig;

    // Lazy-loaded query managers
    private _users?: UsersQueryManager;
    private _hostVerifications?: HostVerificationsQueryManager;
    private _hosts?: HostsQueryManager;
    private _experiences?: ExperiencesQueryManager;
    private _categories?: CategoriesQueryManager;
    private _subCategories?: SubCategoriesQueryManager;
    private _timeSlots?: TimeSlotsQueryManager;
    private _availability?: AvailabilityQueryManager;
    private _reservations?: ReservationsQueryManager;

    constructor(config: PostgresConfig) {
        this.config = config;
    }

    private async buildClientConfig(config: PostgresConfig) {
        let password = config.password;

        if (config.useIamAuth && config.region) {
            try {
                const signer = new Signer({
                    region: config.region,
                    hostname: config.host,
                    port: config.port,
                    username: config.user,
                });

                password = await signer.getAuthToken();
                console.log("Generated IAM auth token for RDS connection");
            } catch (error) {
                console.error("Failed to generate IAM auth token:", error);
                throw new Error(
                    "Failed to generate IAM auth token for database connection"
                );
            }
        }

        const clientConfig: any = {
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password,
            ssl: config.ssl || { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
        };

        // Don't set statement_timeout when using RDS Proxy as it's not supported
        if (!config.useRdsProxy) {
            clientConfig.statement_timeout = 30000;
        }

        return clientConfig;
    }

    private connectionPromise: Promise<void> | null = null;

    async connect(): Promise<void> {
        if (!this.connectionPromise) {
            this.connectionPromise = this.establishConnection();
        }
        return this.connectionPromise;
    }

    private async establishConnection(): Promise<void> {
        if (!this.client) {
            const clientConfig = await this.buildClientConfig(this.config);
            this.client = new Client(clientConfig);
            this.instance = drizzle(this.client);
        }
        await this.client.connect();
    }

    // Lazy getters for query managers
    get users(): UsersQueryManager {
        if (!this._users) {
            this._users = new UsersQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._users;
    }

    get hostVerifications(): HostVerificationsQueryManager {
        if (!this._hostVerifications) {
            this._hostVerifications = new HostVerificationsQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._hostVerifications;
    }

    get hosts(): HostsQueryManager {
        if (!this._hosts) {
            this._hosts = new HostsQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._hosts;
    }

    get experiences(): ExperiencesQueryManager {
        if (!this._experiences) {
            this._experiences = new ExperiencesQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._experiences;
    }

    get categories(): CategoriesQueryManager {
        if (!this._categories) {
            this._categories = new CategoriesQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._categories;
    }

    get subCategories(): SubCategoriesQueryManager {
        if (!this._subCategories) {
            this._subCategories = new SubCategoriesQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._subCategories;
    }

    get timeSlots(): TimeSlotsQueryManager {
        if (!this._timeSlots) {
            this._timeSlots = new TimeSlotsQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._timeSlots;
    }

    get availability(): AvailabilityQueryManager {
        if (!this._availability) {
            this._availability = new AvailabilityQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._availability;
    }

    get reservations(): ReservationsQueryManager {
        if (!this._reservations) {
            this._reservations = new ReservationsQueryManager(
                () => this.getInstance(),
                () => this.connect()
            );
        }
        return this._reservations;
    }

    private getInstance(): NodePgDatabase {
        if (!this.instance) {
            throw new Error(
                "Database instance not initialized. Call connect() first."
            );
        }
        return this.instance;
    }

    async close(): Promise<void> {
        await this.client.end();
    }
}
