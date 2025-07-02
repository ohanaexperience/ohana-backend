import Postgres from "@/database/postgres";

export interface DatabaseServiceOptions {
    database: Postgres;
}
