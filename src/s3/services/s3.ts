import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { extension } from "mime-types";

import { S3Event } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
    GetProfileImageUploadUrlRequest,
    GetExperienceImageUploadUrlsRequest,
} from "../validations";
import { S3ServiceOptions } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";

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

    // Generate upload urls
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

    async hostGetExperienceImageUploadUrls(
        request: GetExperienceImageUploadUrlsRequest
    ) {
        const { authorization, experienceId, images } = request;

        const { sub } = decodeToken(authorization);

        const experience = await this.db.experiences.getById(experienceId);

        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        const coverImages = images.filter((img) => img.imageType === "cover");
        const galleryImages = images.filter(
            (img) => img.imageType === "gallery"
        );
        const meetingLocationImages = images.filter(
            (img) => img.imageType === "meeting-location"
        );

        const coverUploadResults = await Promise.allSettled(
            coverImages.map((image) =>
                this.generateUploadUrl({
                    image,
                    experienceId,
                    userId: sub,
                    imageType: "cover",
                })
            )
        );

        const galleryUploadResults = await Promise.allSettled(
            galleryImages.map((image) =>
                this.generateUploadUrl({
                    image,
                    experienceId,
                    userId: sub,
                    imageType: "gallery",
                })
            )
        );

        const meetingLocationUploadResults = await Promise.allSettled(
            meetingLocationImages.map((image) =>
                this.generateUploadUrl({
                    image,
                    experienceId,
                    userId: sub,
                    imageType: "meeting-location",
                })
            )
        );

        // Extract successful uploads
        const coverUploadUrl =
            coverUploadResults.map(
                (result) => (result as PromiseFulfilledResult<any>).value
            )[0] || null;

        const galleryUploadUrls = galleryUploadResults.map(
            (result) => (result as PromiseFulfilledResult<any>).value
        );

        const meetingLocationUploadUrls = meetingLocationUploadResults.map(
            (result) => (result as PromiseFulfilledResult<any>).value
        );

        return {
            coverUploadUrl,
            ...(galleryUploadUrls.length > 0 && { galleryUploadUrls }),
            ...(meetingLocationUploadUrls.length > 0 && {
                meetingLocationUploadUrls,
            }),
        };
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
        image: { mimeType: string };
        experienceId: string;
        userId: string;
        imageType: string;
    }) {
        const fileExtension = extension(image.mimeType);
        const fileName = `${uuidv4()}.${fileExtension}`;
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
                userId,
                imageType,
                uploadedAt: dayjs().toISOString(),
            },
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: 900,
        });

        return uploadUrl;
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

        if (imageType === "cover") {
            await this.db.experiences.update(experienceId, {
                coverImageUrl: imageUrl,
                updatedAt: new Date(),
            });
        } else if (imageType === "gallery") {
            const experience = await this.db.experiences.getById(experienceId);

            if (!experience) {
                throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
            }

            const galleryImageUrls = experience.galleryImageUrls || [];

            await this.db.experiences.update(experienceId, {
                galleryImageUrls: [...galleryImageUrls, imageUrl],
            });
        } else if (imageType === "meeting-location") {
            const experience = await this.db.experiences.getById(experienceId);

            await this.db.experiences.update(experienceId, {
                meetingLocation: { ...experience.meetingLocation!, imageUrl },
                updatedAt: new Date(),
            });
        }
    }

    private parseS3Event(request: S3Event) {
        const record = request.Records[0];
        const { awsRegion: region } = record;
        const { name: bucket } = record.s3.bucket;
        const key = decodeURIComponent(record.s3.object.key);

        const assetsDomain =
            this.config.assetsDomain || `${bucket}.s3.${region}.amazonaws.com`;
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
                throw new Error(ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE);
            }

            return {
                ...baseParams,
                type: "experience" as const,
                userId: keyParts[1],
                experienceId: keyParts[3],
                imageType: imageType as
                    | "cover"
                    | "gallery"
                    | "meeting-location",
            };
        }

        throw new Error(`Unsupported S3 key pattern: ${key}`);
    }
}
