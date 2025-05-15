import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

import { PostgresConfig } from "../database_factory";

import {
    UsersQueryManager,
    HostVerificationsQueryManager,
    HostsQueryManager,
} from "./query_managers";

export default class Postgres {
    private pool: Pool;

    public instance: NodePgDatabase;
    public users: UsersQueryManager;
    public hostVerifications: HostVerificationsQueryManager;
    public hosts: HostsQueryManager;

    constructor(config: PostgresConfig) {
        this.pool = new Pool(config);
        this.instance = drizzle(this.pool);

        // Query Managers
        this.users = new UsersQueryManager(this.instance);
        this.hostVerifications = new HostVerificationsQueryManager(
            this.instance
        );
        this.hosts = new HostsQueryManager(this.instance);
    }
}
