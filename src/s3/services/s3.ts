import dayjs from "dayjs";
import { extension } from "mime-types";
import { v4 as uuidv4 } from "uuid";

import { S3Event } from "aws-lambda";
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { GetProfileImageUploadUrlRequest } from "../validations";
import { S3ServiceOptions, ImageObject } from "../types";

import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";
import {
    EXPERIENCE_IMAGE_TYPES,
    EXPERIENCE_GALLERY_IMAGE_MAX_COUNT,
} from "@/constants/experiences";

export class S3Service {
    private readonly db: Postgres;
    private readonly s3Client: S3Client;

    private readonly config: Pick<
        S3ServiceOptions,
        "bucketName" | "assetsDomain"
    >;

    private static readonly PRESIGNED_URL_EXPIRY = 900; // 15 minutes
    private static readonly HTTP_SUCCESS_CODES = [200, 204];
    private static readonly IMAGE_TYPES = {
        COVER: "cover",
        GALLERY: "gallery",
        MEETING_LOCATION: "meeting-location",
    } as const;
    private static readonly PATH_SEPARATORS = {
        USERS: "users",
        HOSTS: "hosts",
        EXPERIENCES: "experiences",
        PROFILE: "profile",
        IMAGES: "images",
    } as const;

    private logInfo(message: string, data?: any) {
        console.log(`[S3Service] ${message}`, data || "");
    }

    private logError(message: string, error?: any) {
        console.error(`[S3Service] ${message}`, error || "");
    }

    constructor({ database, s3Client, ...config }: S3ServiceOptions) {
        this.db = database;
        this.s3Client = s3Client;

        this.config = config;
    }

    async getProfileImageUploadUrl(request: GetProfileImageUploadUrlRequest) {
        const { authorization, mimeType } = request;

        const fileExtension = extension(mimeType);

        const { sub } = decodeToken(authorization);

        const fileName = `${uuidv4()}.${fileExtension}`;
        const key = `${S3Service.PATH_SEPARATORS.USERS}/${sub}/${S3Service.PATH_SEPARATORS.PROFILE}/${S3Service.PATH_SEPARATORS.IMAGES}/${fileName}`;

        this.logInfo(`Generating presigned URL for profile image upload:`);
        this.logInfo(`- Bucket: ${this.config.bucketName}`);
        this.logInfo(`- Key: ${key}`);
        this.logInfo(`- Content-Type: ${mimeType}`);
        this.logInfo(`- User ID: ${sub}`);

        const command = new PutObjectCommand({
            Bucket: this.config.bucketName,
            Key: key,
            ContentType: mimeType,
        });

        const preSignedUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: S3Service.PRESIGNED_URL_EXPIRY,
        });

        this.logInfo(
            `Generated presigned URL: ${preSignedUrl.split("?")[0]}?[REDACTED]`
        );

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

    async replaceExperienceImage(request: {
        authorization: string;
        experienceId: string;
        imageId: string;
        mimeType: string;
    }) {
        const { authorization, experienceId, imageId, mimeType } = request;

        const { sub: userId } = decodeToken(authorization);

        // Validate experience ownership
        const experience = await this.db.experiences.getById(experienceId);
        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        const host = await this.db.hosts.getByUserId(userId);
        if (!host || experience.hostId !== host.id) {
            throw new Error(ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE);
        }

        // Find the image type by imageId
        const imageTypeAndFound = this.findImageTypeById(experience, imageId);
        if (!imageTypeAndFound.found) {
            throw new Error(
                `Image with ID ${imageId} not found in experience ${experienceId}`
            );
        }
        const imageType = imageTypeAndFound.type;

        // Find existing image in the experience to get its current key
        let existingImageKey: string | null = null;

        existingImageKey = this.getExistingImageKey(
            experience,
            imageType,
            imageId
        );

        // Generate new upload URL for replacement
        const uploadUrl = await this.generateUploadUrl({
            image: { id: imageId, mimeType, imageType },
            experienceId,
            userId,
            imageType,
        });

        // Delete the old image if it exists and has a different key
        // (this handles cases where file extension/MIME type changes)
        if (existingImageKey) {
            try {
                const fileExtension = extension(mimeType);
                const keyPrefix = this.generateKeyPrefix(
                    userId,
                    experienceId,
                    imageType
                );
                const newKey = `${keyPrefix}/${imageId}.${fileExtension}`;

                // Only delete if the keys are different (different file extension)
                if (existingImageKey !== newKey) {
                    this.logInfo(
                        `Deleting old image with different key: ${existingImageKey} -> ${newKey}`
                    );
                    await this.deleteSpecificImageByKey(existingImageKey);
                }
            } catch (error) {
                this.logError(
                    "Could not delete old image, proceeding with new upload",
                    error
                );
            }
        }

        return {
            imageId,
            imageType,
            uploadUrl,
        };
    }

    async addExperienceImage(request: {
        authorization: string;
        experienceId: string;
        imageType: string;
        mimeType: string;
    }) {
        const { authorization, experienceId, imageType, mimeType } = request;

        const { sub: userId } = decodeToken(authorization);

        // Validate experience ownership
        const experience = await this.db.experiences.getById(experienceId);
        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        const host = await this.db.hosts.getByUserId(userId);
        if (!host || experience.hostId !== host.id) {
            throw new Error(ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE);
        }

        // Validate imageType constraints
        if (imageType === S3Service.IMAGE_TYPES.COVER && experience.coverImage) {
            throw new Error("Cover image already exists. Use replace endpoint instead.");
        }

        if (imageType === S3Service.IMAGE_TYPES.MEETING_LOCATION && 
            experience.meetingLocation?.image) {
            throw new Error("Meeting location image already exists. Use replace endpoint instead.");
        }

        if (imageType === S3Service.IMAGE_TYPES.GALLERY) {
            const galleryImageCount = experience.galleryImages?.length || 0;
            if (galleryImageCount >= EXPERIENCE_GALLERY_IMAGE_MAX_COUNT) {
                throw new Error(
                    `Maximum of ${EXPERIENCE_GALLERY_IMAGE_MAX_COUNT} gallery images allowed`
                );
            }
        }

        // Generate new image ID and upload URL
        const imageId = uuidv4();
        const uploadUrl = await this.generateUploadUrl({
            image: { id: imageId, mimeType, imageType },
            experienceId,
            userId,
            imageType,
        });

        return {
            imageId,
            imageType,
            uploadUrl,
        };
    }

    async deleteExperienceImages(experienceId: string) {
        try {
            // Get the experience to find the host ID
            const experience = await this.db.experiences.getById(experienceId);
            if (!experience) {
                this.logInfo(`Experience not found: ${experienceId}`);
                return; // Experience doesn't exist, nothing to delete
            }

            // Get host information to construct the S3 prefix
            // Note: In the hosts table, the host.id is the userId (references usersTable.id)
            const userId = experience.hostId;
            const prefix = `hosts/${userId}/experiences/${experienceId}/images/`;

            this.logInfo(
                `Deleting images for experience ${experienceId} with prefix: ${prefix}`
            );

            // List all objects with the experience prefix
            const listCommand = new ListObjectsV2Command({
                Bucket: this.config.bucketName,
                Prefix: prefix,
            });

            const listResponse = await this.s3Client.send(listCommand);

            if (!listResponse.Contents || listResponse.Contents.length === 0) {
                this.logInfo(`No images found for experience ${experienceId}`);
                return;
            }

            this.logInfo(
                `Found ${listResponse.Contents.length} images to delete`
            );

            // Delete all objects
            const deletePromises = listResponse.Contents.map((object) => {
                if (object.Key) {
                    this.logInfo(`Deleting: ${object.Key}`);
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: this.config.bucketName,
                        Key: object.Key,
                    });
                    return this.s3Client.send(deleteCommand);
                }
                return Promise.resolve();
            });

            await Promise.all(deletePromises);
            this.logInfo(
                `Successfully deleted ${deletePromises.length} images for experience ${experienceId}`
            );
        } catch (error) {
            this.logError(
                `Error deleting images for experience ${experienceId}`,
                error
            );
            throw error;
        }
    }

    async deleteExperienceImageById(request: {
        authorization: string;
        experienceId: string;
        imageId: string;
    }) {
        try {
            this.logInfo(
                `Starting deleteExperienceImageById for experience ${request.experienceId}, image ${request.imageId}`
            );

            const { authorization, experienceId, imageId } = request;

            const { sub: userId } = decodeToken(authorization);
            this.logInfo(`Decoded user ID: ${userId}`);

            // Validate experience ownership
            const experience = await this.db.experiences.getById(experienceId);
            if (!experience) {
                this.logError(`Experience not found: ${experienceId}`);
                throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
            }
            this.logInfo(`Experience found: ${experienceId}`);

            const host = await this.db.hosts.getByUserId(userId);
            if (!host || experience.hostId !== host.id) {
                this.logError(
                    `Access denied - user ${userId} is not the host of experience ${experienceId}`
                );
                throw new Error(ERRORS.EXPERIENCE.FORBIDDEN_DELETE.CODE);
            }
            this.logInfo(`Host validation passed for user ${userId}`);

            const imageTypeAndFound = this.findImageTypeById(
                experience,
                imageId
            );

            if (!imageTypeAndFound.found) {
                this.logError(
                    `Image not found: ${imageId} in experience ${experienceId}`
                );
                throw new Error(
                    `Image with ID ${imageId} not found in experience ${experienceId}`
                );
            }

            const imageType = imageTypeAndFound.type;
            this.logInfo(`Found image type: ${imageType} for image ${imageId}`);

            // Get the stored key from the database
            const existingImageKey = this.getExistingImageKey(
                experience,
                imageType,
                imageId
            );
            if (!existingImageKey) {
                this.logError(
                    `Image key not found for image ${imageId} in experience ${experienceId}`
                );
                this.logInfo(
                    `Experience data:`,
                    JSON.stringify(experience, null, 2)
                );
                throw new Error(
                    `Image key not found for image ${imageId} in experience ${experienceId}`
                );
            }
            this.logInfo(`Found existing image key: ${existingImageKey}`);

            // Delete from S3 using the stored key
            await this.deleteSpecificImageByKey(existingImageKey);
            this.logInfo(
                `Successfully deleted image from S3: ${existingImageKey}`
            );

            // Update database record
            await this.removeImageFromExperience(
                experienceId,
                imageId,
                imageType
            );
            this.logInfo(
                `Successfully updated database for experience ${experienceId}`
            );

            return {
                message: `Image ${imageId} successfully deleted from experience ${experienceId}`,
            };
        } catch (error) {
            this.logError(`Error in deleteExperienceImageById:`, error);
            throw error;
        }
    }

    private async removeImageFromExperience(
        experienceId: string,
        imageId: string,
        imageType: string
    ) {
        const experience = await this.db.experiences.getById(experienceId);
        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        await this.updateExperienceAfterImageDeletion(
            experienceId,
            imageId,
            imageType,
            experience
        );
    }

    private async deleteSpecificImageByKey(key: string) {
        try {
            console.log(`[S3Service] Deleting image by key: ${key}`);

            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
            });

            await this.s3Client.send(deleteCommand);
            console.log(`[S3Service] Successfully deleted image: ${key}`);
        } catch (error) {
            console.error(`[S3Service] Error deleting image ${key}:`, error);
            throw error;
        }
    }

    private getExistingImageKey(
        experience: any,
        imageType: string,
        imageId: string
    ): string | null {
        let imageObject: any = null;

        switch (imageType) {
            case S3Service.IMAGE_TYPES.COVER:
                imageObject = experience.coverImage;
                break;
            case S3Service.IMAGE_TYPES.GALLERY:
                imageObject = experience.galleryImages?.find(
                    (img: any) => img.id === imageId
                );
                break;
            case S3Service.IMAGE_TYPES.MEETING_LOCATION:
                imageObject = experience.meetingLocation?.image;
                break;
            default:
                return null;
        }

        return this.getImageKeyFromImageObject(imageObject);
    }

    private findImageTypeById(
        experience: any,
        imageId: string
    ): { type: string; found: boolean } {
        // Check cover image
        if (experience.coverImage && experience.coverImage.id === imageId) {
            return { type: S3Service.IMAGE_TYPES.COVER, found: true };
        }

        // Check gallery images
        if (experience.galleryImages) {
            const galleryImage = experience.galleryImages.find(
                (img: any) => img.id === imageId
            );
            if (galleryImage) {
                return { type: S3Service.IMAGE_TYPES.GALLERY, found: true };
            }
        }

        // Check meeting location image
        if (
            experience.meetingLocation &&
            experience.meetingLocation.image &&
            experience.meetingLocation.image.id === imageId
        ) {
            return {
                type: S3Service.IMAGE_TYPES.MEETING_LOCATION,
                found: true,
            };
        }

        return { type: "", found: false };
    }

    private async updateExperienceAfterImageDeletion(
        experienceId: string,
        imageId: string,
        imageType: string,
        experience: any
    ) {
        switch (imageType) {
            case S3Service.IMAGE_TYPES.COVER:
                await this.db.experiences.update(experienceId, {
                    coverImage: null,
                });
                break;
            case S3Service.IMAGE_TYPES.GALLERY:
                const updatedGalleryImages = (
                    experience.galleryImages || []
                ).filter((img: any) => img.id !== imageId);
                await this.db.experiences.update(experienceId, {
                    galleryImages: updatedGalleryImages,
                });
                break;
            case S3Service.IMAGE_TYPES.MEETING_LOCATION:
                if (experience.meetingLocation) {
                    const { image, ...meetingLocationWithoutImage } =
                        experience.meetingLocation;
                    await this.db.experiences.update(experienceId, {
                        meetingLocation: meetingLocationWithoutImage,
                    });
                }
                break;
            default:
                throw new Error(`Unknown image type: ${imageType}`);
        }
    }

    private generateKeyPrefix(
        userId: string,
        experienceId: string,
        imageType: string
    ) {
        const basePath = `${S3Service.PATH_SEPARATORS.HOSTS}/${userId}/${S3Service.PATH_SEPARATORS.EXPERIENCES}/${experienceId}/${S3Service.PATH_SEPARATORS.IMAGES}`;

        switch (imageType) {
            case S3Service.IMAGE_TYPES.COVER:
                return `${basePath}/${S3Service.IMAGE_TYPES.COVER}`;
            case S3Service.IMAGE_TYPES.GALLERY:
                return `${basePath}/${S3Service.IMAGE_TYPES.GALLERY}`;
            case S3Service.IMAGE_TYPES.MEETING_LOCATION:
                return `${basePath}/${S3Service.IMAGE_TYPES.MEETING_LOCATION}`;
            default:
                throw new Error(`Unknown image type: ${imageType}`);
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
            expiresIn: S3Service.PRESIGNED_URL_EXPIRY,
        });
    }

    async deleteProfileImage(userId: string, imageKey: string) {
        try {
            this.logInfo(
                `Attempting to delete profile image for user ${userId}`
            );
            this.logInfo(`Image key: ${imageKey}`);
            this.logInfo(`Bucket name: ${this.config.bucketName}`);

            const expectedPrefix = `${S3Service.PATH_SEPARATORS.USERS}/${userId}/${S3Service.PATH_SEPARATORS.PROFILE}/${S3Service.PATH_SEPARATORS.IMAGES}/`;

            if (!imageKey.startsWith(expectedPrefix)) {
                this.logInfo(
                    `Key format validation failed. Expected to start with '${expectedPrefix}', got: ${imageKey}`
                );
                return;
            }

            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.config.bucketName,
                Key: imageKey,
            });

            this.logInfo(`Sending delete command to S3...`);
            const result = await this.s3Client.send(deleteCommand);
            this.logInfo(`Delete command result:`, result);

            if (
                S3Service.HTTP_SUCCESS_CODES.includes(
                    result.$metadata.httpStatusCode || 0
                )
            ) {
                this.logInfo(`Successfully deleted profile image: ${imageKey}`);
            } else {
                this.logInfo(
                    `Delete command returned unexpected status: ${result.$metadata.httpStatusCode}`
                );
            }
        } catch (error) {
            this.logError(
                `Error deleting profile image for user ${userId}`,
                error
            );
            throw error;
        }
    }

    private getImageKeyFromImageObject(imageObject: any): string | null {
        return imageObject?.key || null;
    }

    // Triggers
    async handleProfileImageUpload(request: S3Event) {
        const { userId, imageUrl, key } = this.parseS3Event(request);

        const { imageId, mimeType } = this.extractImageMetadata(key);

        const existingUser = await this.db.users.getByUserId(userId);

        // Delete existing profile image if it exists and has a key
        const existingImageKey = this.getImageKeyFromImageObject(
            existingUser?.profileImage
        );
        if (existingImageKey) {
            try {
                await this.deleteProfileImage(userId, existingImageKey);
                this.logInfo(
                    `Successfully deleted existing profile image for user ${userId}`
                );
            } catch (error) {
                this.logError(
                    `Failed to delete existing profile image for user ${userId}`,
                    error
                );
                // Continue with upload even if deletion fails
                this.logInfo(
                    `IMPORTANT: Old profile image may still exist in S3 bucket`
                );
            }
        } else {
            this.logInfo(
                `No existing profile image key found for user ${userId} - proceeding with new upload`
            );
        }

        const profileImage = {
            id: imageId,
            mimeType,
            url: imageUrl,
            key,
        };

        this.logInfo(
            `Updating user ${userId} with profile image:`,
            profileImage
        );

        try {
            const result = await this.db.users.update(userId, {
                profileImage,
                updatedAt: new Date(),
            });

            this.logInfo(`Database update result:`, result);
            this.logInfo(`Successfully updated user ${userId} profile image`);
        } catch (dbError) {
            this.logError(
                `Database update failed for user ${userId}:`,
                dbError
            );
            throw dbError;
        }
    }

    async handleExperienceImageUpload(request: S3Event) {
        const parsedEvent = this.parseS3Event(request);

        if (parsedEvent.type !== "experience") {
            throw new Error(ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE);
        }

        const { imageType, experienceId, imageUrl, key } = parsedEvent;

        const { imageId, mimeType } = this.extractImageMetadata(key);

        const experience = await this.db.experiences.getById(experienceId);

        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        await this.updateExperienceImage(
            experience,
            imageType,
            imageId,
            mimeType,
            imageUrl,
            key,
            experienceId
        );
    }

    private parseS3Event(request: S3Event): {
        type: "profile" | "experience";
        userId: string;
        experienceId: string;
        imageType: string;
        imageUrl: string;
        key: string;
    } {
        const record = request.Records[0];
        const { awsRegion: region } = record;
        const { name: bucket } = record.s3.bucket;
        const key = decodeURIComponent(record.s3.object.key);

        // Use CloudFront domain if available, otherwise fall back to S3 domain
        const cdnDomain = process.env.ASSETS_CDN_DOMAIN;
        const assetsDomain = cdnDomain || 
            this.config.assetsDomain || 
            `${bucket}.s3.${region}.amazonaws.com`;
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

    private extractImageMetadata(key: string): {
        imageId: string;
        mimeType: string;
    } {
        const fileName = key.split("/").pop();
        const imageId = fileName?.split(".")[0];

        if (!imageId) {
            throw new Error("Image ID not found in filename.");
        }

        const mimeType = this.getMimeTypeFromExtension(fileName);

        return { imageId, mimeType };
    }

    private getMimeTypeFromExtension(fileName?: string): string {
        const fileExtension = fileName?.split(".").pop()?.toLowerCase();

        switch (fileExtension) {
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "png":
                return "image/png";
            case "webp":
                return "image/webp";
            default:
                return "application/octet-stream";
        }
    }

    private async updateExperienceImage(
        experience: any,
        imageType: string,
        imageId: string,
        mimeType: string,
        imageUrl: string,
        key: string,
        experienceId: string
    ): Promise<void> {
        const imageObject = {
            mimeType,
            id: imageId,
            url: imageUrl,
            key,
        };

        switch (imageType) {
            case "cover":
                await this.db.experiences.update(experienceId, {
                    coverImage: imageObject,
                });
                break;
            case "gallery":
                const existingGalleryImages = experience.galleryImages || [];
                const existingImageIndex = existingGalleryImages.findIndex(
                    (img: any) => img.id === imageId
                );

                let updatedGalleryImages;
                if (existingImageIndex >= 0) {
                    updatedGalleryImages = [...existingGalleryImages];
                    updatedGalleryImages[existingImageIndex] = imageObject;
                } else {
                    if (
                        existingGalleryImages.length >=
                        EXPERIENCE_GALLERY_IMAGE_MAX_COUNT
                    ) {
                        throw new Error(
                            `Maximum of ${EXPERIENCE_GALLERY_IMAGE_MAX_COUNT} gallery images allowed`
                        );
                    }
                    updatedGalleryImages = [
                        ...existingGalleryImages,
                        imageObject,
                    ];
                }

                await this.db.experiences.update(experienceId, {
                    galleryImages: updatedGalleryImages,
                });
                break;
            case "meeting-location":
                await this.db.experiences.update(experienceId, {
                    meetingLocation: {
                        ...experience.meetingLocation!,
                        image: imageObject,
                    },
                });
                break;
            default:
                throw new Error(`Unknown image type: ${imageType}`);
        }
    }
}
