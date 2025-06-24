import { S3Event } from "aws-lambda";

import { S3Service } from "../services/s3";
import {
    GetProfileImageUploadUrlRequest,
    GetExperienceImageUploadUrlsRequest,
} from "../validations";
import { S3ServiceOptions } from "../types";

import ERRORS from "@/errors";

export class S3Controller {
    private readonly s3Service: S3Service;

    constructor(opts: S3ServiceOptions) {
        this.s3Service = new S3Service(opts);
    }

    async getProfileImageUploadUrl(request: GetProfileImageUploadUrlRequest) {
        try {
            const result = await this.s3Service.getProfileImageUploadUrl(
                request
            );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async hostGetExperienceImageUploadUrls(
        request: GetExperienceImageUploadUrlsRequest
    ) {
        try {
            const result =
                await this.s3Service.hostGetExperienceImageUploadUrls(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async handleProfileImageUpload(request: S3Event) {
        try {
            const result = await this.s3Service.handleProfileImageUpload(
                request
            );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async handleExperienceImageUpload(request: S3Event) {
        try {
            const result = await this.s3Service.handleExperienceImageUpload(
                request
            );

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    private handleError(error: any) {
        switch (error.message) {
            case ERRORS.EXPERIENCE.NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.NOT_FOUND.CODE,
                        message: ERRORS.EXPERIENCE.NOT_FOUND.MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.CODE,
                        message: ERRORS.EXPERIENCE.IMAGES.INVALID_TYPE.MESSAGE,
                    }),
                };

            default:
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "Internal server error",
                        message: "An unexpected error occurred",
                    }),
                };
        }
    }
}
