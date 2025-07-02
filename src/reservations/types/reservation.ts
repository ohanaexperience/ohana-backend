import Postgres from "@/database/postgres";

export interface ReservationServiceOptions {
    // Dependencies
    database: Postgres;
}
