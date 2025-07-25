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
    AdminLinkProviderForUserCommand,
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

        const confirmSignUpCommand = new ConfirmSignUpCommand({
            ClientId: this.config.userPoolClientId,
            Username: email,
            ConfirmationCode: confirmationCode,
        });
        const response = await this.cognitoClient.send(confirmSignUpCommand);

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

        console.log("Email confirmation code resent successfully:", response);

        return {
            message: "Verification code confirmed.",
        };
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

        const payload = await this.verifyGoogleToken(idToken);

        console.log("payload", payload);

        if (!payload) {
            throw new Error(ERRORS.GOOGLE_ID_TOKEN.INVALID.CODE);
        }

        const decodedToken: any = jwtDecode(idToken);

        console.log("decodedToken", decodedToken);

        // Check if the user already exists in the user pool
        const userExists = await this.cognitoUserExists(decodedToken.email);

        if (userExists) {
            const initiateAuthCommand = new AdminInitiateAuthCommand({
                UserPoolId: this.config.userPoolId,
                ClientId: this.config.userPoolClientId,
                AuthFlow: "ADMIN_NO_SRP_AUTH",
                AuthParameters: {
                    USERNAME: decodedToken.email,
                    PASSWORD: "X&NEq##tr7Mf4j3a",
                },
            });
            const { AuthenticationResult } = await this.cognitoClient.send(
                initiateAuthCommand
            );

            console.log("AuthenticationResult", AuthenticationResult);

            return {
                statusCode: 200,
                body: JSON.stringify(AuthenticationResult),
            };
        }

        // Create the user in the user pool
        const createUserCommand = new AdminCreateUserCommand({
            UserPoolId: this.config.userPoolId,
            Username: decodedToken.email,
            UserAttributes: [
                {
                    Name: "email",
                    Value: decodedToken.email,
                },
                {
                    Name: "email_verified",
                    Value: "true",
                },
            ],
            MessageAction: "SUPPRESS",
        });
        const newUser = await this.cognitoClient.send(createUserCommand);
        const sub = newUser.User?.Attributes?.find(
            (attr) => attr.Name === "sub"
        )?.Value;

        if (sub) {
            // Create the user in the database
            await this.db.users.create({
                id: sub,
                email: decodedToken.email,
                authProvider: "google",
            });
        }

        // Set permanent password for user
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: this.config.userPoolId,
            Username: decodedToken.email,
            Password: "X&NEq##tr7Mf4j3a",
            Permanent: true,
        });
        await this.cognitoClient.send(setPasswordCommand);

        // Link the user to the Google provider
        const linkCommand = new AdminLinkProviderForUserCommand({
            UserPoolId: this.config.userPoolId,
            DestinationUser: {
                ProviderName: "Cognito",
                ProviderAttributeValue: decodedToken.email,
            },
            SourceUser: {
                ProviderName: "Google",
                ProviderAttributeName: "Cognito_Subject",
                ProviderAttributeValue: decodedToken.sub,
            },
        });
        await this.cognitoClient.send(linkCommand);

        // Initiate Auth With Cognito
        const initiateAuthCommand = new AdminInitiateAuthCommand({
            UserPoolId: this.config.userPoolId,
            ClientId: this.config.userPoolClientId,
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            AuthParameters: {
                USERNAME: decodedToken.email,
                PASSWORD: "X&NEq##tr7Mf4j3a",
            },
        });
        const { AuthenticationResult } = await this.cognitoClient.send(
            initiateAuthCommand
        );

        console.log("response", AuthenticationResult);

        return AuthenticationResult;
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

    private async cognitoUserExists(email: string) {
        try {
            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: this.config.userPoolId,
                Username: email,
            });
            await this.cognitoClient.send(getUserCommand);

            return true;
        } catch (err: any) {
            if (err.name === "UserNotFoundException") return false;

            throw err;
        }
    }
}
