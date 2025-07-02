import { S3Client } from "@aws-sdk/client-s3";
import Postgres from "@/database/postgres";

export interface S3ServiceOptions {
    // Dependencies
    database: Postgres;
    s3Client: S3Client;

    // Config
    bucketName: string;
    assetsDomain?: string;
}

export type ImageObject = {
    id: string;
    mimeType: string;
    imageType: string;
};
