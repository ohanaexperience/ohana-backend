import Postgres from "@/database/postgres";

export interface HostServiceOptions {
    database: Postgres;
}

export interface GetProfileRequest {
    authorization: string;
}

export interface UpdateProfileRequest {
    authorization: string;
    bio?: string;
    languages?: string[];
}