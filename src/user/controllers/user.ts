import { UpdateUserProfileRequest } from "../validations";
import { UserServiceOptions } from "../types";
import { UserService } from "../services/user";

import ERRORS from "@/errors";

export class UserController {
    private readonly userService: UserService;

    constructor(opts: UserServiceOptions) {
        this.userService = new UserService(opts);
    }

    // User
    async getProfile(request: { authorization: string }) {
        try {
            const result = await this.userService.getProfile(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async updateProfile(request: UpdateUserProfileRequest) {
        try {
            const result = await this.userService.updateProfile(request);

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
            case ERRORS.USER.NOT_FOUND.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.USER.NOT_FOUND.CODE,
                        message: ERRORS.USER.NOT_FOUND.MESSAGE,
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
