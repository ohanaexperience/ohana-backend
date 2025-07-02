import { ExperienceService } from "../services/experience";
import {
    CreateExperienceRequest,
    DeleteExperienceRequest,
    PublicExperienceSearchRequest,
    UserExperienceSearchRequest,
    UpdateExperienceRequest,
} from "../validations";
import { ExperienceServiceOptions } from "../types";

import ERRORS from "@/errors";

export class ExperienceController {
    private readonly experienceService: ExperienceService;

    constructor(opts: ExperienceServiceOptions) {
        this.experienceService = new ExperienceService(opts);
    }

    // Public User
    async publicGetExperiences(request: PublicExperienceSearchRequest) {
        try {
            const result = await this.experienceService.publicGetExperiences(
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

    // Authenticated User
    async userGetExperiences(request: UserExperienceSearchRequest) {
        try {
            const result = await this.experienceService.userGetExperiences(
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

    // Host
    async hostGetExperiences(request: { authorization: string }) {
        try {
            const result = await this.experienceService.hostGetExperiences(
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

    async hostCreateExperience(request: CreateExperienceRequest) {
        try {
            const result = await this.experienceService.hostCreateExperience(
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

    async hostUpdateExperience(request: UpdateExperienceRequest) {
        try {
            const result = await this.experienceService.hostUpdateExperience(
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

    async hostDeleteExperience(request: DeleteExperienceRequest) {
        try {
            const result = await this.experienceService.hostDeleteExperience(
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
            case ERRORS.HOST.NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.HOST.NOT_FOUND.CODE,
                        message: ERRORS.HOST.NOT_FOUND.MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.NOT_FOUND.CODE,
                        message: ERRORS.EXPERIENCE.NOT_FOUND.MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.FORBIDDEN_DELETE.CODE:
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.FORBIDDEN_DELETE.CODE,
                        message: ERRORS.EXPERIENCE.FORBIDDEN_DELETE.MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE:
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.CODE,
                        message: ERRORS.EXPERIENCE.FORBIDDEN_UPDATE.MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.CATEGORY.MAIN.INVALID_VALUE.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.CATEGORY.MAIN.INVALID_VALUE
                            .CODE,
                        message:
                            ERRORS.EXPERIENCE.CATEGORY.MAIN.INVALID_VALUE
                                .MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.CATEGORY.SUB.INVALID_VALUE.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.CATEGORY.SUB.INVALID_VALUE
                            .CODE,
                        message:
                            ERRORS.EXPERIENCE.CATEGORY.SUB.INVALID_VALUE
                                .MESSAGE,
                    }),
                };

            case ERRORS.EXPERIENCE.CATEGORY.MISMATCH.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.EXPERIENCE.CATEGORY.MISMATCH.CODE,
                        message: ERRORS.EXPERIENCE.CATEGORY.MISMATCH.MESSAGE,
                    }),
                };

            default:
                console.log("error", error);

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
