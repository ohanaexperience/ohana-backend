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
import { EXPERIENCE_IMAGE_TYPES, EXPERIENCE_GALLERY_IMAGE_MAX_COUNT } from "@/constants/experiences";

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

        const fileName = `${uuidv4()}.${fileExtension}`;
        const key = `users/${sub}/profile/images/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: this.config.bucketName,
            Key: key,
            ContentType: mimeType,
        });

        const preSignedUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: 900,
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

    async replaceExperienceImage(request: {
        authorization: string;
        experienceId: string;
        imageId: string;
        imageType: string;
        mimeType: string;
    }) {
        const { authorization, experienceId, imageId, imageType, mimeType } = request;

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

        // Find existing image in the experience to get its current URL/key
        let existingImageUrl: string | null = null;
        
        switch (imageType) {
            case "cover":
                existingImageUrl = experience.coverImage?.url || null;
                break;
            case "gallery":
                const existingGalleryImage = experience.galleryImages?.find(
                    (img: any) => img.id === imageId
                );
                existingImageUrl = existingGalleryImage?.url || null;
                break;
            case "meeting-location":
                existingImageUrl = experience.meetingLocation?.image?.url || null;
                break;
        }

        // Generate new upload URL for replacement
        const uploadUrl = await this.generateUploadUrl({
            image: { id: imageId, mimeType, imageType },
            experienceId,
            userId,
            imageType,
        });

        // Delete the old image if it exists and has a different key
        // (this handles cases where file extension/MIME type changes)
        if (existingImageUrl) {
            try {
                const oldKey = this.extractS3KeyFromUrl(existingImageUrl);
                const fileExtension = extension(mimeType);
                const keyPrefix = this.generateKeyPrefix(userId, experienceId, imageType);
                const newKey = `${keyPrefix}/${imageId}.${fileExtension}`;
                
                // Only delete if the keys are different (different file extension)
                if (oldKey && oldKey !== newKey) {
                    console.log(`[S3Service] Deleting old image with different key: ${oldKey} -> ${newKey}`);
                    await this.deleteSpecificImageByKey(oldKey);
                }
            } catch (error) {
                console.log(`[S3Service] Could not delete old image, proceeding with new upload: ${error}`);
            }
        }

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
                console.log(
                    `[S3Service] Experience not found: ${experienceId}`
                );
                return; // Experience doesn't exist, nothing to delete
            }

            // Get host information to construct the S3 prefix
            // Note: In the hosts table, the host.id is the userId (references usersTable.id)
            const userId = experience.hostId;
            const prefix = `hosts/${userId}/experiences/${experienceId}/images/`;

            console.log(
                `[S3Service] Deleting images for experience ${experienceId} with prefix: ${prefix}`
            );

            // List all objects with the experience prefix
            const listCommand = new ListObjectsV2Command({
                Bucket: this.config.bucketName,
                Prefix: prefix,
            });

            const listResponse = await this.s3Client.send(listCommand);

            if (!listResponse.Contents || listResponse.Contents.length === 0) {
                console.log(
                    `[S3Service] No images found for experience ${experienceId}`
                );
                return;
            }

            console.log(
                `[S3Service] Found ${listResponse.Contents.length} images to delete`
            );

            // Delete all objects
            const deletePromises = listResponse.Contents.map((object) => {
                if (object.Key) {
                    console.log(`[S3Service] Deleting: ${object.Key}`);
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: this.config.bucketName,
                        Key: object.Key,
                    });
                    return this.s3Client.send(deleteCommand);
                }
                return Promise.resolve();
            });

            await Promise.all(deletePromises);
            console.log(
                `[S3Service] Successfully deleted ${deletePromises.length} images for experience ${experienceId}`
            );
        } catch (error) {
            console.error(
                `[S3Service] Error deleting images for experience ${experienceId}:`,
                error
            );
            throw error;
        }
    }

    async deleteSpecificImage(experienceId: string, imageId: string, imageType: string, userId: string) {
        try {
            const keyPrefix = this.generateKeyPrefix(userId, experienceId, imageType);
            const key = `${keyPrefix}/${imageId}`;
            
            console.log(`[S3Service] Deleting specific image: ${key}`);
            
            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
            });
            
            await this.s3Client.send(deleteCommand);
            console.log(`[S3Service] Successfully deleted image: ${key}`);
        } catch (error) {
            console.error(`[S3Service] Error deleting specific image ${imageId}:`, error);
            throw error;
        }
    }

    async deleteExperienceImageById(request: {
        authorization: string;
        experienceId: string;
        imageId: string;
    }) {
        const { authorization, experienceId, imageId } = request;

        const { sub: userId } = decodeToken(authorization);

        // Validate experience ownership
        const experience = await this.db.experiences.getById(experienceId);
        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        const host = await this.db.hosts.getByUserId(userId);
        if (!host || experience.hostId !== host.id) {
            throw new Error(ERRORS.EXPERIENCE.FORBIDDEN_DELETE.CODE);
        }

        // Find the image in the experience record to get its type
        let imageType: string | null = null;
        let imageFound = false;

        // Check cover image
        if (experience.coverImage && experience.coverImage.id === imageId) {
            imageType = "cover";
            imageFound = true;
        }

        // Check gallery images
        if (!imageFound && experience.galleryImages) {
            const galleryImage = experience.galleryImages.find((img: any) => img.id === imageId);
            if (galleryImage) {
                imageType = "gallery";
                imageFound = true;
            }
        }

        // Check meeting location image
        if (!imageFound && experience.meetingLocation && experience.meetingLocation.image && experience.meetingLocation.image.id === imageId) {
            imageType = "meeting-location";
            imageFound = true;
        }

        if (!imageFound || !imageType) {
            throw new Error(`Image with ID ${imageId} not found in experience ${experienceId}`);
        }

        // Delete from S3
        await this.deleteSpecificImage(experienceId, imageId, imageType, userId);

        // Update database record
        await this.removeImageFromExperience(experienceId, imageId, imageType);

        return {
            message: `Image ${imageId} successfully deleted from experience ${experienceId}`,
        };
    }

    private async removeImageFromExperience(experienceId: string, imageId: string, imageType: string) {
        const experience = await this.db.experiences.getById(experienceId);
        if (!experience) {
            throw new Error(ERRORS.EXPERIENCE.NOT_FOUND.CODE);
        }

        switch (imageType) {
            case "cover":
                await this.db.experiences.update(experienceId, {
                    coverImage: null,
                });
                break;
            case "gallery":
                const updatedGalleryImages = (experience.galleryImages || []).filter(
                    (img: any) => img.id !== imageId
                );
                await this.db.experiences.update(experienceId, {
                    galleryImages: updatedGalleryImages,
                });
                break;
            case "meeting-location":
                if (experience.meetingLocation) {
                    await this.db.experiences.update(experienceId, {
                        meetingLocation: {
                            instructions: experience.meetingLocation.instructions,
                        },
                    });
                }
                break;
            default:
                throw new Error(`Unknown image type: ${imageType}`);
        }
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

    async deleteProfileImage(userId: string, imageUrl: string) {
        try {
            console.log(`[S3Service] Attempting to delete profile image for user ${userId}`);
            console.log(`[S3Service] Image URL: ${imageUrl}`);
            console.log(`[S3Service] Bucket name: ${this.config.bucketName}`);
            
            const key = this.extractS3KeyFromUrl(imageUrl);
            if (!key) {
                console.log(
                    `[S3Service] Invalid image URL format: ${imageUrl}`
                );
                return;
            }

            console.log(`[S3Service] Extracted S3 key: ${key}`);

            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
            });

            console.log(`[S3Service] Sending delete command to S3...`);
            const result = await this.s3Client.send(deleteCommand);
            console.log(`[S3Service] Delete command result:`, result);
            console.log(
                `[S3Service] Successfully deleted profile image: ${key}`
            );
        } catch (error) {
            console.error(
                `[S3Service] Error deleting profile image for user ${userId}:`,
                error
            );
            throw error;
        }
    }

    private extractS3KeyFromUrl(imageUrl: string): string | null {
        try {
            console.log(`[S3Service] Extracting S3 key from URL: ${imageUrl}`);
            
            const url = new URL(imageUrl);
            console.log(`[S3Service] Parsed URL hostname: ${url.hostname}`);
            console.log(`[S3Service] Parsed URL pathname: ${url.pathname}`);
            
            let key: string;
            
            // Handle different S3 URL formats:
            // 1. https://bucket-name.s3.region.amazonaws.com/key
            // 2. https://s3.region.amazonaws.com/bucket-name/key
            // 3. Custom domain: https://assets.domain.com/key
            
            if (url.hostname.includes('.s3.') || url.hostname.includes('s3-')) {
                // Standard S3 URL format
                key = url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname;
            } else {
                // Custom domain - assume the entire pathname is the key
                key = url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname;
            }
            
            console.log(`[S3Service] Extracted key: ${key}`);
            return key || null;
        } catch (error) {
            console.error(
                `[S3Service] Error parsing image URL: ${imageUrl}`,
                error
            );
            return null;
        }
    }

    // Triggers
    async handleProfileImageUpload(request: S3Event) {
        const { userId, imageUrl, key } = this.parseS3Event(request);

        const { imageId, mimeType } = this.extractImageMetadata(key);

        // Get existing user data to check for existing profile image
        console.log(`[S3Service] Fetching existing user data for userId: ${userId}`);
        const existingUser = await this.db.users.getByUserId(userId);
        console.log(`[S3Service] Existing user data:`, JSON.stringify(existingUser, null, 2));

        // Delete existing profile image if it exists
        if (existingUser?.profileImage?.url) {
            console.log(`[S3Service] Found existing profile image for user ${userId}: ${existingUser.profileImage.url}`);
            console.log(`[S3Service] Existing image ID: ${existingUser.profileImage.id}`);
            console.log(`[S3Service] Existing image mimeType: ${existingUser.profileImage.mimeType}`);
            
            try {
                await this.deleteProfileImage(
                    userId,
                    existingUser.profileImage.url
                );
                console.log(`[S3Service] Successfully initiated deletion of existing profile image`);
            } catch (error) {
                console.error(
                    `[S3Service] Failed to delete existing profile image for user ${userId}:`,
                    error
                );
                // Continue with upload even if deletion fails
            }
        } else {
            console.log(`[S3Service] No existing profile image found for user ${userId}`);
            if (existingUser) {
                console.log(`[S3Service] User exists but profileImage is:`, existingUser.profileImage);
            } else {
                console.log(`[S3Service] User not found in database`);
            }
        }

        const profileImage = {
            id: imageId,
            mimeType,
            url: imageUrl,
        };

        await this.db.users.update(userId, {
            profileImage,
            updatedAt: new Date(),
        });
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
        experienceId: string
    ): Promise<void> {
        const imageObject = {
            mimeType,
            id: imageId,
            url: imageUrl,
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
                    if (existingGalleryImages.length >= EXPERIENCE_GALLERY_IMAGE_MAX_COUNT) {
                        throw new Error(`Maximum of ${EXPERIENCE_GALLERY_IMAGE_MAX_COUNT} gallery images allowed`);
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
