import { AuthService } from "../services/auth";
import { AuthServiceOptions } from "../types";

import ERRORS from "@/errors";
import {
    PhoneRegisterRequestData,
    EmailRegisterRequestData,
    EmailResendCodeRequestData,
    EmailConfirmCodeRequestData,
    EmailForgotPasswordRequestData,
    EmailConfirmForgotPasswordRequestData,
    EmailLoginRequestData,
    RefreshTokensRequestData,
    GoogleSignInRequestData,
} from "../validations";

export class AuthController {
    private readonly authService: AuthService;

    constructor(opts: AuthServiceOptions) {
        this.authService = new AuthService(opts);
    }

    // Phone
    async phoneRegister(request: PhoneRegisterRequestData) {
        try {
            const result = await this.authService.phoneRegister(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    // Email
    async emailRegister(request: EmailRegisterRequestData) {
        try {
            const result = await this.authService.emailRegister(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async emailResendCode(request: EmailResendCodeRequestData) {
        try {
            const result = await this.authService.emailResendCode(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async emailConfirmCode(request: EmailConfirmCodeRequestData) {
        try {
            const result = await this.authService.emailConfirmCode(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async emailForgotPassword(request: EmailForgotPasswordRequestData) {
        try {
            const result = await this.authService.emailForgotPassword(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    async emailConfirmForgotPassword(
        request: EmailConfirmForgotPasswordRequestData
    ) {
        try {
            const result = await this.authService.emailConfirmForgotPassword(
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

    async emailLogin(request: EmailLoginRequestData) {
        try {
            const result = await this.authService.emailLogin(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    // Tokens
    async refreshTokens(request: RefreshTokensRequestData) {
        try {
            const result = await this.authService.refreshTokens(request);

            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        } catch (err: unknown) {
            return this.handleError(err);
        }
    }

    // Google
    async googleSignIn(request: GoogleSignInRequestData) {
        try {
            const result = await this.authService.googleSignIn(request);

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
            case ERRORS.GOOGLE_ID_TOKEN.INVALID.CODE:
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.GOOGLE_ID_TOKEN.INVALID.CODE,
                        message: ERRORS.GOOGLE_ID_TOKEN.INVALID.MESSAGE,
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
