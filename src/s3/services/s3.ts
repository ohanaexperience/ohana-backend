import dayjs from "dayjs";
import { extension } from "mime-types";

import { S3Event } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { GetProfileImageUploadUrlRequest } from "../validations";
import { S3ServiceOptions, ImageObject } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";
import { EXPERIENCE_IMAGE_TYPES } from "@/constants/experiences";

export class S3Service {
    private readonly db: Postgres;
    private readonly s3Client: S3Client;

    private readonly config: Pick<
        S3ServiceOptions,
        "bucketName" | "assetsDomain"
    >;

    constructor({ database, s3Client, ...config }: S3ServiceOptions) {
        this.db = database;
        this.s3Client = s3Client;

        this.config = config;
    }

    async getProfileImageUploadUrl(request: GetProfileImageUploadUrlRequest) {
        const { authorization, mimeType } = request;

        const fileExtension = extension(mimeType);

        const { sub } = decodeToken(authorization);
        const timeNowUnix = dayjs().unix();

        const fileName = `${sub}_${timeNowUnix}.${fileExtension}`;
        const key = `users/${sub}/profile/images/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: this.config.bucketName,
            Key: key,
            ContentType: mimeType,
        });

        const preSignedUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: 600,
        });

        return {
            uploadUrl: preSignedUrl,
        };
    }

    async getExperienceImageUploadUrls(opts: {
        authorization: string;
        experienceId: string;
        images: ImageObject[];
    }) {
        const { authorization, experienceId, images } = opts;

        const { sub: userId } = decodeToken(authorization);

        const uploadUrls = await Promise.all(
            images.map((image) =>
                this.generateUploadUrl({
                    image,
                    experienceId,
                    userId,
                    imageType: image.imageType,
                })
            )
        );

        return images.map((image, index) => ({
            ...image,
            uploadUrl: uploadUrls[index],
        }));
    }

    private generateKeyPrefix(
        userId: string,
        experienceId: string,
        imageType: string
    ) {
        switch (imageType) {
            case "cover":
                return `hosts/${userId}/experiences/${experienceId}/images/cover`;
            case "gallery":
                return `hosts/${userId}/experiences/${experienceId}/images/gallery`;
            case "meeting-location":
                return `hosts/${userId}/experiences/${experienceId}/images/meeting-location`;
        }
    }

    private async generateUploadUrl({
        image,
        experienceId,
        userId,
        imageType,
    }: {
        image: ImageObject;
        experienceId: string;
        userId: string;
        imageType: string;
    }) {
        const fileExtension = extension(image.mimeType);
        const fileName = `${image.id}.${fileExtension}`;
        const keyPrefix = this.generateKeyPrefix(
            userId,
            experienceId,
            imageType
        );
        const key = `${keyPrefix}/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: this.config.bucketName,
            Key: key,
            ContentType: image.mimeType,
            Metadata: {
                imageId: image.id,
                userId,
                imageType,
                uploadedAt: dayjs().toISOString(),
            },
        });

        return await getSignedUrl(this.s3Client, command, {
            expiresIn: 900,
        });
    }

    // Triggers
    async handleProfileImageUpload(request: S3Event) {
        const { userId, imageUrl } = this.parseS3Event(request);

        await this.db.users.update(userId, {
            profileImageUrl: imageUrl,
            updatedAt: new Date(),
        });
    }

    async handleExperienceImageUpload(request: S3Event) {
        const parsedEvent = this.parseS3Event(request);

        if (parsedEvent.type !== "experience") {
            throw new Error(ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE);
        }

        const { imageType, experienceId, imageUrl } = parsedEvent;

        const experience = await this.db.experiences.getById(experienceId);

        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        switch (imageType) {
            case "cover":
                await this.db.experiences.update(experienceId, {
                    coverImageUrl: imageUrl,
                    updatedAt: new Date(),
                });
                break;
            case "gallery":
                const galleryImageUrls = experience.galleryImageUrls || [];

                await this.db.experiences.update(experienceId, {
                    galleryImageUrls: [...galleryImageUrls, imageUrl],
                });
                break;
            case "meeting-location":
                await this.db.experiences.update(experienceId, {
                    meetingLocation: {
                        ...experience.meetingLocation!,
                        imageUrl,
                    },
                    updatedAt: new Date(),
                });
                break;
        }
    }

    private parseS3Event(request: S3Event): {
        type: "profile" | "experience";
        userId: string;
        experienceId: string;
        imageType: string;
        imageUrl: string;
    } {
        const record = request.Records[0];
        const { awsRegion: region } = record;
        const { name: bucket } = record.s3.bucket;
        const key = decodeURIComponent(record.s3.object.key);

        const assetsDomain =
            this.config.assetsDomain || `${bucket}.s3.${region}.amazonaws.com`;
        const imageUrl = `https://${assetsDomain}/${key}`;

        const keyParts = key.split("/");
        const baseParams = { region, bucket, key, imageUrl, assetsDomain };

        const uploadType = this.determineUploadType(keyParts);

        switch (uploadType) {
            case "profile":
                return this.parseProfileImageEvent(keyParts, baseParams);
            case "experience":
                return this.parseExperienceImageEvent(keyParts, baseParams);
            default:
                throw new Error(`Unsupported S3 key pattern: ${key}`);
        }
    }

    private determineUploadType(keyParts: string[]) {
        if (this.isProfileImagePattern(keyParts)) {
            return "profile";
        }

        if (this.isExperienceImagePattern(keyParts)) {
            return "experience";
        }

        return null;
    }

    private isProfileImagePattern(keyParts: string[]): boolean {
        return (
            keyParts.length >= 4 &&
            keyParts[0] === "users" &&
            keyParts[2] === "profile" &&
            keyParts[3] === "images"
        );
    }

    private isExperienceImagePattern(keyParts: string[]): boolean {
        return (
            keyParts.length >= 6 &&
            keyParts[0] === "hosts" &&
            keyParts[2] === "experiences" &&
            keyParts[4] === "images"
        );
    }

    private parseProfileImageEvent(keyParts: string[], baseParams: any) {
        const userId = keyParts[1];

        return {
            ...baseParams,
            type: "profile",
            userId,
        };
    }

    private parseExperienceImageEvent(keyParts: string[], baseParams: any) {
        const userId = keyParts[1];
        const experienceId = keyParts[3];
        const imageType = keyParts[5];

        if (!EXPERIENCE_IMAGE_TYPES.includes(imageType)) {
            throw new Error(ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE);
        }

        return {
            ...baseParams,
            type: "experience",
            userId,
            experienceId,
            imageType,
        };
    }
}
