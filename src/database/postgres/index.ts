import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

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
} from "./query_managers";

export default class Postgres {
    private pool: Pool;
    public instance: NodePgDatabase;

    // Lazy-loaded query managers
    private _users?: UsersQueryManager;
    private _hostVerifications?: HostVerificationsQueryManager;
    private _hosts?: HostsQueryManager;
    private _experiences?: ExperiencesQueryManager;
    private _categories?: CategoriesQueryManager;
    private _subCategories?: SubCategoriesQueryManager;
    private _timeSlots?: TimeSlotsQueryManager;
    private _availability?: AvailabilityQueryManager;

    constructor(config: PostgresConfig) {
        this.pool = new Pool(config);
        this.instance = drizzle(this.pool);
    }

    // Lazy getters for query managers
    get users(): UsersQueryManager {
        if (!this._users) {
            this._users = new UsersQueryManager(this.instance);
        }
        return this._users;
    }

    get hostVerifications(): HostVerificationsQueryManager {
        if (!this._hostVerifications) {
            this._hostVerifications = new HostVerificationsQueryManager(
                this.instance
            );
        }
        return this._hostVerifications;
    }

    get hosts(): HostsQueryManager {
        if (!this._hosts) {
            this._hosts = new HostsQueryManager(this.instance);
        }
        return this._hosts;
    }

    get experiences(): ExperiencesQueryManager {
        if (!this._experiences) {
            this._experiences = new ExperiencesQueryManager(this.instance);
        }
        return this._experiences;
    }

    get categories(): CategoriesQueryManager {
        if (!this._categories) {
            this._categories = new CategoriesQueryManager(this.instance);
        }
        return this._categories;
    }

    get subCategories(): SubCategoriesQueryManager {
        if (!this._subCategories) {
            this._subCategories = new SubCategoriesQueryManager(this.instance);
        }
        return this._subCategories;
    }

    get timeSlots(): TimeSlotsQueryManager {
        if (!this._timeSlots) {
            this._timeSlots = new TimeSlotsQueryManager(this.instance);
        }
        return this._timeSlots;
    }

    get availability(): AvailabilityQueryManager {
        if (!this._availability) {
            this._availability = new AvailabilityQueryManager(this.instance);
        }
        return this._availability;
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
