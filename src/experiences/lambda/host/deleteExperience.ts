import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import requirePathParameters from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { S3Client } from "@aws-sdk/client-s3";

import {
    DeleteExperienceData,
    DeleteExperiencePathSchema,
} from "../../validations";
import { ExperienceController } from "../../controllers/experience";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { S3Service } from "@/s3/services/s3";
import { zodValidator } from "@/middleware";

dayjs.extend(timezone);
dayjs.extend(utc);

const {
    ASSETS_BUCKET_NAME,
} = process.env;

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const s3Client = new S3Client({
    region: "us-east-1",
});
const s3Service = new S3Service({
    database: db,
    s3Client,
    bucketName: ASSETS_BUCKET_NAME!,
});
const experienceController = new ExperienceController({
    database: db,
    s3Service,
});

export const handler = middy(async (event: DeleteExperienceData) => {
    const { authorization } = event.headers;
    const { experienceId } = event.pathParameters;

    console.log("event", event);

    return await experienceController.hostDeleteExperience({
        authorization: authorization!,
        experienceId,
    });
})
    .use(httpHeaderNormalizer())
    .use(requirePathParameters())
    .use(zodValidator({ pathParameters: DeleteExperiencePathSchema }))
    .use(cors());
