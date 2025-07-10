import { HostService } from "../services/host";
import {
    GetProfileRequest,
    UpdateProfileRequest,
    HostServiceOptions,
    GetPublicProfileRequest,
} from "../types";

import ERRORS from "@/errors";

export class HostController {
    private readonly hostService: HostService;

    constructor(opts: HostServiceOptions) {
        this.hostService = new HostService(opts);
    }

    async getProfile(request: GetProfileRequest) {
        try {
            const result = await this.hostService.getProfile(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async getPublicProfile(request: GetPublicProfileRequest) {
        try {
            const result = await this.hostService.getPublicProfile(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async updateProfile(request: UpdateProfileRequest) {
        try {
            const result = await this.hostService.updateProfile(request);

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
            case ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE,
                        message: ERRORS.HOST_VERIFICATION.NOT_VERIFIED.MESSAGE,
                    }),
                };

            case ERRORS.HOST.NOT_FOUND.CODE:
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        error: ERRORS.HOST.NOT_FOUND.CODE,
                        message: ERRORS.HOST.NOT_FOUND.MESSAGE,
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
