import Postgres from "@/database/postgres";
import { S3Service } from "@/s3/services/s3";

export interface ExperienceServiceOptions {
    database: Postgres;
    s3Service?: S3Service;
}
