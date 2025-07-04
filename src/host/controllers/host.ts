import { HostService } from "../services/host";
import { GetProfileRequest, UpdateProfileRequest, HostServiceOptions } from "../types";
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
        console.error("Host controller error:", error);

        if (error.__type) {
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify({
                    error: error.__type,
                    message: error.message,
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal server error",
                message: "An unexpected error occurred",
            }),
        };
    }
}