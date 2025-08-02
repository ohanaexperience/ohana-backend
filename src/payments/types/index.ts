import Postgres from "@/database/postgres";

export interface PaymentServiceOptions {
    database: Postgres;
}