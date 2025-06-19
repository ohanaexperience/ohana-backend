import { S3Event } from "aws-lambda";

import { DatabaseFactory } from "@/database";

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

interface BaseS3EventParams {
    region: string;
    bucket: string;
    key: string;
    userId: string;
    imageUrl: string;
    assetsDomain: string;
}

interface ProfileImageParams extends BaseS3EventParams {
    type: "profile";
}

interface ExperienceImageParams extends BaseS3EventParams {
    type: "experience";
    experienceId: string;
    imageType: "cover" | "gallery" | "meeting-location";
}

type S3EventParams = ProfileImageParams | ExperienceImageParams;

export const handleProfileImageUpload = async (event: S3Event) => {
    console.log("event", event);

    const { userId, imageUrl } = parseS3Event(event);

    await db.users.update(userId, {
        profileImageUrl: imageUrl,
        updatedAt: new Date(),
    });
};

export const handleExperienceImageUpload = async (event: S3Event) => {
    console.log("event", JSON.stringify(event, null, 2));

    const { userId, experienceId, imageType, imageUrl, key } =
        parseS3Event(event);

    try {
        if (imageType === "cover") {
            await db.experiences.update(experienceId, {
                coverImageUrl: imageUrl,
                updatedAt: new Date(),
            });
        } else if (imageType === "gallery") {
            const experience = await db.experiences.getById(experienceId);

            if (!experience) {
                throw new Error("Experience not found");
            }

            const galleryImageUrls = experience.galleryImageUrls || [];

            await db.experiences.update(experienceId, {
                galleryImageUrls: [...galleryImageUrls, imageUrl],
            });
        } else if (imageType === "meeting-location") {
            const experience = await db.experiences.getById(experienceId);

            await db.experiences.update(experienceId, {
                meetingLocation: { ...experience.meetingLocation!, imageUrl },
                updatedAt: new Date(),
            });
        }
    } catch (err) {
        console.error("Error updating experience image", err);
        throw err;
    }
};

const parseS3Event = (event: S3Event): S3EventParams => {
    const record = event.Records[0];
    const { awsRegion: region } = record;
    const { name: bucket } = record.s3.bucket;
    const key = decodeURIComponent(record.s3.object.key);

    const assetsDomain =
        ASSETS_DOMAIN || `${bucket}.s3.${region}.amazonaws.com`;
    const imageUrl = `https://${assetsDomain}/${key}`;

    const keyParts = key.split("/");

    // Base params common to both types
    const baseParams = { region, bucket, key, imageUrl, assetsDomain };

    const isProfilePattern =
        keyParts[0] === "users" &&
        keyParts[2] === "profile" &&
        keyParts[3] === "images";
    if (isProfilePattern) {
        return {
            ...baseParams,
            type: "profile" as const,
            userId: keyParts[1],
        };
    }

    const isExperiencePattern =
        keyParts[0] === "hosts" &&
        keyParts[2] === "experiences" &&
        keyParts[4] === "images";
    if (isExperiencePattern) {
        const imageType = keyParts[5];

        if (
            imageType !== "cover" &&
            imageType !== "gallery" &&
            imageType !== "meeting-location"
        ) {
            throw new Error(`Invalid experience image type: ${imageType}`);
        }

        return {
            ...baseParams,
            type: "experience" as const,
            userId: keyParts[1],
            experienceId: keyParts[3],
            imageType: imageType as "cover" | "gallery" | "meeting-location",
        };
    }

    throw new Error(`Unsupported S3 key pattern: ${key}`);
};
