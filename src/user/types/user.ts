import Postgres from "@/database/postgres";

export interface UserServiceOptions {
    database: Postgres;
}
