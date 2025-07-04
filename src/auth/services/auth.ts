import passwordGenerator from "generate-password";
import { jwtDecode } from "jwt-decode";

import { OAuth2Client } from "google-auth-library";

import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    ResendConfirmationCodeCommand,
    ConfirmSignUpCommand,
    AdminGetUserCommand,
    ForgotPasswordCommand,
    AdminInitiateAuthCommand,
    InitiateAuthCommand,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    ConfirmForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { AuthServiceOptions } from "../types";
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

import Postgres from "@/database/postgres";
import ERRORS from "@/errors";

export class AuthService {
    private readonly db: Postgres;
    private readonly cognitoClient: CognitoIdentityProviderClient;
    private readonly googleClient: OAuth2Client;
    private readonly config: Pick<
        AuthServiceOptions,
        "userPoolId" | "userPoolClientId" | "googleClientId"
    >;

    constructor({
        database,
        cognitoClient,
        googleClient,
        ...config
    }: AuthServiceOptions) {
        this.db = database;
        this.cognitoClient = cognitoClient;
        this.googleClient = googleClient;

        this.config = config;
    }

    async phoneRegister(request: PhoneRegisterRequestData) {
        const { phoneNumber } = request;

        const password = passwordGenerator.generate({
            length: 16,
            numbers: true,
            uppercase: true,
            symbols: true,
            lowercase: true,
        });

        const signUpCommand = new SignUpCommand({
            ClientId: this.config.userPoolClientId,
            Username: phoneNumber,
            Password: password,
            UserAttributes: [
                {
                    Name: "phone_number",
                    Value: phoneNumber,
                },
            ],
        });
        const response = await this.cognitoClient.send(signUpCommand);

        // console.log("SMS sent successfully:", response);
        console.log("Sign up successful:", response);

        return {
            message: "Verification code successfully sent.",
        };
    }

    async emailRegister(request: EmailRegisterRequestData) {
        const { email, password } = request;

        try {
            const signUpCommand = new SignUpCommand({
                ClientId: this.config.userPoolClientId,
                Username: email,
                Password: password,
            });
            const response = await this.cognitoClient.send(signUpCommand);

            console.log("Sign up successful:", response);

            return {
                message: "User successfully created.",
            };
        } catch (error: any) {
            if (error.__type === "UsernameExistsException") {
                throw new Error(ERRORS.USER.ALREADY_EXISTS.CODE);
            }

            throw error;
        }
    }

    async emailResendCode(request: EmailResendCodeRequestData) {
        const { email } = request;

        const resendConfirmationCommand = new ResendConfirmationCodeCommand({
            ClientId: this.config.userPoolClientId,
            Username: email,
        });
        const response = await this.cognitoClient.send(
            resendConfirmationCommand
        );

        console.log("Email confirmation code resent successfully:", response);

        return {
            message: "Email verification code sent.",
        };
    }

    async emailConfirmCode(request: EmailConfirmCodeRequestData) {
        const { email, confirmationCode } = request;

        try {
            const confirmSignUpCommand = new ConfirmSignUpCommand({
                ClientId: this.config.userPoolClientId,
                Username: email,
                ConfirmationCode: confirmationCode,
            });
            const response = await this.cognitoClient.send(
                confirmSignUpCommand
            );

            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: this.config.userPoolId,
                Username: email,
            });
            const user = await this.cognitoClient.send(getUserCommand);

            const sub = user.UserAttributes?.find(
                (attr) => attr.Name === "sub"
            )?.Value;

            if (sub) {
                await this.db.users.create({ id: sub, email });
            }

            console.log(
                "Email confirmation code confirmed successfully:",
                response
            );

            return {
                message: "Verification code confirmed.",
            };
        } catch (error: any) {
            console.error("Error confirming email code:", error);

            if (error.__type === "ExpiredCodeException") {
                throw new Error(ERRORS.CONFIRMATION_CODE.EXPIRED.CODE);
            }

            if (error.__type === "CodeMismatchException") {
                throw new Error(ERRORS.CONFIRMATION_CODE.INVALID.CODE);
            }

            throw error;
        }
    }

    async emailForgotPassword(request: EmailForgotPasswordRequestData) {
        const { email } = request;

        const forgotPasswordCommand = new ForgotPasswordCommand({
            ClientId: this.config.userPoolClientId,
            Username: email,
        });
        const response = await this.cognitoClient.send(forgotPasswordCommand);

        console.log("Forgot password email sent successfully:", response);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Email sent with instructions to reset password.",
            }),
        };
    }

    async emailConfirmForgotPassword(
        request: EmailConfirmForgotPasswordRequestData
    ) {
        const { email, newPassword, confirmationCode } = request;

        const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
            ClientId: this.config.userPoolClientId,
            ConfirmationCode: confirmationCode,
            Username: email,
            Password: newPassword,
        });
        const response = await this.cognitoClient.send(
            confirmForgotPasswordCommand
        );

        console.log("New password set successfully:", response);

        return {
            message: "Password successfully changed.",
        };
    }

    async emailLogin(request: EmailLoginRequestData) {
        const { email, password } = request;

        const adminInitiateAuthCommand = new AdminInitiateAuthCommand({
            UserPoolId: this.config.userPoolId,
            ClientId: this.config.userPoolClientId,
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        });
        const data = await this.cognitoClient.send(adminInitiateAuthCommand);

        console.log("Successfully logged in with email:", data);

        if (!data.AuthenticationResult || !data.AuthenticationResult.IdToken) {
            return {
                ChallengeName: data.ChallengeName,
                ChallengeParameters: data.ChallengeParameters,
                Session: data.Session,
            };
        }

        return data.AuthenticationResult;
    }

    async refreshTokens(request: RefreshTokensRequestData) {
        const { refreshToken } = request;

        const initiateAuthCommand = new InitiateAuthCommand({
            ClientId: this.config.userPoolClientId,
            AuthFlow: "REFRESH_TOKEN_AUTH",
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
            },
        });
        const data = await this.cognitoClient.send(initiateAuthCommand);

        console.log("Successfully refreshed token:", data);

        if (!data.AuthenticationResult) {
            return {
                ChallengeName: data.ChallengeName,
                ChallengeParameters: data.ChallengeParameters,
                Session: data.Session,
            };
        }

        return data.AuthenticationResult;
    }

    async googleSignIn(request: GoogleSignInRequestData) {
        const { idToken } = request;
        const startTime = Date.now();

        console.log(`[googleSignIn] Starting Google sign-in process`);

        const payload = await this.verifyGoogleToken(idToken);

        console.log(
            `[googleSignIn][${Date.now() - startTime}ms] Token verified`
        );

        if (!payload) {
            throw new Error(ERRORS.GOOGLE_ID_TOKEN.INVALID.CODE);
        }

        const decodedToken: any = jwtDecode(idToken);
        const username = decodedToken.email;

        console.log(
            `[googleSignIn][${Date.now() - startTime}ms] Processing user: ${
                decodedToken.email
            }`
        );

        // Check if the user already exists in the user pool
        const userExists = await this.cognitoUserExists(username);

        if (userExists) {
            console.log(
                `[googleSignIn][${
                    Date.now() - startTime
                }ms] User exists, generating new password`
            );

            // Generate a new unique password for existing user authentication
            const tempPassword = passwordGenerator.generate({
                length: 32,
                numbers: true,
                uppercase: true,
                symbols: true,
                lowercase: true,
            });

            await this.setUserPassword(username, tempPassword);
            const authResult = await this.authenticateUser(
                username,
                tempPassword
            );

            console.log(
                `[googleSignIn][${
                    Date.now() - startTime
                }ms] Existing user authenticated successfully`
            );
            return authResult;
        }

        console.log(
            `[googleSignIn][${Date.now() - startTime}ms] Creating new user`
        );
        return await this.createGoogleUser(decodedToken, username, startTime);
    }

    private async createGoogleUser(
        decodedToken: any,
        username: string,
        startTime: number
    ) {
        const tempPassword = passwordGenerator.generate({
            length: 32,
            numbers: true,
            uppercase: true,
            symbols: true,
            lowercase: true,
        });

        try {
            console.log(
                `[createGoogleUser][${
                    Date.now() - startTime
                }ms] Creating Cognito user`
            );

            // Create the user in the user pool
            const createUserCommand = new AdminCreateUserCommand({
                UserPoolId: this.config.userPoolId,
                Username: username,
                UserAttributes: [
                    {
                        Name: "email",
                        Value: decodedToken.email,
                    },
                    {
                        Name: "email_verified",
                        Value: "true",
                    },
                    {
                        Name: "custom:auth_method",
                        Value: "google",
                    },
                    {
                        Name: "custom:google_sub",
                        Value: decodedToken.sub,
                    },
                ],
                MessageAction: "SUPPRESS",
                TemporaryPassword: tempPassword,
            });

            const newUser = await this.cognitoClient.send(createUserCommand);
            const sub = newUser.User?.Attributes?.find(
                (attr) => attr.Name === "sub"
            )?.Value;

            console.log(
                `[createGoogleUser][${
                    Date.now() - startTime
                }ms] Cognito user created, creating database record`
            );

            if (sub) {
                // Create the user in the database
                await this.db.users.create({
                    id: sub,
                    email: decodedToken.email,
                    authProvider: "google",
                });
            }

            console.log(
                `[createGoogleUser][${
                    Date.now() - startTime
                }ms] Setting permanent password`
            );
            await this.setUserPassword(username, tempPassword);

            console.log(
                `[createGoogleUser][${
                    Date.now() - startTime
                }ms] Authenticating new user`
            );
            const authResult = await this.authenticateUser(
                username,
                tempPassword
            );

            console.log(
                `[createGoogleUser][${
                    Date.now() - startTime
                }ms] User creation and authentication completed successfully`
            );
            return authResult;
        } catch (err: any) {
            console.error(
                `[createGoogleUser][${
                    Date.now() - startTime
                }ms] Error occurred:`,
                {
                    name: err?.name,
                    message: err?.message,
                    code: err?.code,
                }
            );
            throw err;
        }
    }

    private async setUserPassword(
        username: string,
        password: string
    ): Promise<void> {
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: this.config.userPoolId,
            Username: username,
            Password: password,
            Permanent: true,
        });
        await this.cognitoClient.send(setPasswordCommand);
    }

    private async authenticateUser(username: string, password: string) {
        const authCommand = new AdminInitiateAuthCommand({
            UserPoolId: this.config.userPoolId,
            ClientId: this.config.userPoolClientId,
            AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
            },
        });

        const response = await this.cognitoClient.send(authCommand);

        if (!response.AuthenticationResult) {
            throw new Error("Cognito authentication failed.");
        }

        return response.AuthenticationResult;
    }

    private async verifyGoogleToken(token: string) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: this.config.googleClientId,
            });

            const payload = ticket.getPayload();
            console.log(
                "Google token payload:",
                JSON.stringify(payload, null, 2)
            );
            console.log("Google token user ID:", ticket.getUserId());

            return ticket.getPayload();
        } catch (err: any) {
            console.error("Error verifying Google token:", err);
            throw new Error(err);
        }
    }

    private async cognitoUserExists(username: string) {
        try {
            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: this.config.userPoolId,
                Username: username,
            });
            await this.cognitoClient.send(getUserCommand);

            return true;
        } catch (err: any) {
            if (err.name === "UserNotFoundException") return false;

            throw err;
        }
    }
}
