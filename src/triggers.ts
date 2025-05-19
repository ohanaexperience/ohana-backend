import { S3Event } from "aws-lambda";

import DatabaseFactory from "./database/database_factory";

const { DB_ENDPOINT, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, ASSETS_DOMAIN } =
    process.env;

const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: false,
    },
});

export const handleProfileImageUpload = async (event: S3Event) => {
    console.log("event", event);

    const record = event.Records[0];
    const region = record.awsRegion;
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);

    const userId = key.split("/")[1];
    const assetsDomain =
        process.env.ASSETS_DOMAIN || `${bucket}.s3.${region}.amazonaws.com`;
    const imageUrl = `https://${assetsDomain}/${key}`;

    await db.users.update(userId, {
        profileImageUrl: imageUrl,
        updatedAt: new Date(),
    });
};
