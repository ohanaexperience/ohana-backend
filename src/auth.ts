import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpJsonBodyParser from "@middy/http-json-body-parser";

import { jwtDecode } from "jwt-decode";
import { OAuth2Client } from "google-auth-library";
import passwordGenerator from "generate-password";

import { DatabaseFactory } from "@/database";

import {
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
    InitiateAuthCommand,
    SignUpCommand,
    ResendConfirmationCodeCommand,
    ConfirmSignUpCommand,
    ForgotPasswordCommand,
    ConfirmForgotPasswordCommand,
    AdminGetUserCommand,
    AdminCreateUserCommand,
    AdminLinkProviderForUserCommand,
    AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { PostAuthenticationTriggerEvent } from "aws-lambda";

import { requireBody, zodValidator } from "./middleware";
import {
    PhoneRegisterSchema,
    PhoneRegisterData,
    EmailRegisterSchema,
    EmailRegisterData,
    EmailResendCodeSchema,
    EmailResendCodeData,
    EmailConfirmCodeSchema,
    EmailConfirmCodeData,
    EmailForgotPasswordSchema,
    EmailForgotPasswordData,
    ConfirmForgotPasswordSchema,
    ConfirmForgotPasswordData,
    EmailLoginSchema,
    EmailLoginData,
    RefreshTokensSchema,
    RefreshTokensData,
    GoogleSignInSchema,
    GoogleSignInData,
} from "@/validations";
import ERRORS from "@/errors";

const {
    USER_POOL_ID,
    USER_POOL_CLIENT_ID,
    GOOGLE_CLIENT_ID,
    DB_ENDPOINT,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
} = process.env;

const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({
    region: "us-east-1",
});
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: false,
    },
});

export const phoneRegister = middy(async (event: PhoneRegisterData) => {
    const { phoneNumber } = event.body;

    console.log("event", event);

    try {
        const password = passwordGenerator.generate({
            length: 16,
            numbers: true,
            uppercase: true,
            symbols: true,
            lowercase: true,
        });

        const signUpCommand = new SignUpCommand({
            ClientId: USER_POOL_CLIENT_ID,
            Username: phoneNumber,
            Password: password,
            UserAttributes: [
                {
                    Name: "phone_number",
                    Value: phoneNumber,
                },
            ],
        });
        const response = await cognitoIdentityProviderClient.send(
            signUpCommand
        );

        // console.log("SMS sent successfully:", response);
        console.log("Sign up successful:", response);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Verification code successfully sent.",
            }),
        };
    } catch (err: unknown) {
        console.error("Error sending SMS:", err);

        if (err instanceof Error) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Internal server error",
                    message: err.message,
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
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: PhoneRegisterSchema }))
    .use(cors());

export const emailRegister = middy(async (event: EmailRegisterData) => {
    const { email, password } = event.body;

    console.log("event", event);

    try {
        const signUpCommand = new SignUpCommand({
            ClientId: USER_POOL_CLIENT_ID,
            Username: email,
            Password: password,
        });
        const response = await cognitoIdentityProviderClient.send(
            signUpCommand
        );

        console.log("Sign up successful:", response);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "User successfully created.",
            }),
        };
    } catch (err: any) {
        console.error("Error creating user with email:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
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
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: EmailRegisterSchema }))
    .use(cors());

export const emailResendCode = middy(async (event: EmailResendCodeData) => {
    const { email } = event.body;

    try {
        // const getUserCommand = new AdminGetUserCommand({
        //     UserPoolId: USER_POOL_ID,
        //     Username: username,
        // });
        // const user = await cognitoIdentityProviderClient.send(getUserCommand);

        // console.log("user", user);

        // if (!UserAttributes) {

        // }

        const resendConfirmationCommand = new ResendConfirmationCodeCommand({
            ClientId: USER_POOL_CLIENT_ID,
            Username: email,
        });
        const response = await cognitoIdentityProviderClient.send(
            resendConfirmationCommand
        );

        console.log("Email confirmation code resent successfully:", response);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Email verification code sent.",
            }),
        };
    } catch (err: any) {
        console.error("Error resending email confirmation code:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
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
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: EmailResendCodeSchema }))
    .use(cors());

export const emailConfirmCode = middy(async (event: EmailConfirmCodeData) => {
    const { email, confirmationCode } = event.body;

    try {
        const confirmSignUpCommand = new ConfirmSignUpCommand({
            ClientId: USER_POOL_CLIENT_ID,
            Username: email,
            ConfirmationCode: confirmationCode,
        });
        const response = await cognitoIdentityProviderClient.send(
            confirmSignUpCommand
        );

        const getUserCommand = new AdminGetUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
        });
        const user = await cognitoIdentityProviderClient.send(getUserCommand);

        const sub = user.UserAttributes?.find(
            (attr) => attr.Name === "sub"
        )?.Value;

        if (sub) {
            await db.users.create({ id: sub, email });
        }

        console.log("Email confirmation code resent successfully:", response);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Verification code confirmed.",
            }),
        };
    } catch (err: any) {
        console.error("Error confirming confirmation code:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
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
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: EmailConfirmCodeSchema }))
    .use(cors());

export const forgotPassword = middy(async (event: EmailForgotPasswordData) => {
    const { email } = event.body;

    try {
        const forgotPasswordCommand = new ForgotPasswordCommand({
            ClientId: USER_POOL_CLIENT_ID,
            Username: email,
        });
        const response = await cognitoIdentityProviderClient.send(
            forgotPasswordCommand
        );

        console.log("Forgot password email sent successfully:", response);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Email sent with instructions to reset password.",
            }),
        };
    } catch (err: any) {
        console.error("Error sending forgot password email:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
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
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: EmailForgotPasswordSchema }))
    .use(cors());

export const confirmForgotPassword = middy(
    async (event: ConfirmForgotPasswordData) => {
        const { email, newPassword, confirmationCode } = event.body;

        try {
            const confirmForgotPasswordCommand =
                new ConfirmForgotPasswordCommand({
                    ClientId: USER_POOL_CLIENT_ID,
                    ConfirmationCode: confirmationCode,
                    Username: email,
                    Password: newPassword,
                });
            const response = await cognitoIdentityProviderClient.send(
                confirmForgotPasswordCommand
            );

            console.log("New password set successfully:", response);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Password successfully changed.",
                }),
            };
        } catch (err: any) {
            console.error("Error changing password:", err);

            if (err.message) {
                return {
                    statusCode: err.statusCode,
                    body: JSON.stringify({
                        error: err.__type,
                        message: err.message,
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
)
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: ConfirmForgotPasswordSchema }))
    .use(cors());

export const emailLogin = middy(async (event: EmailLoginData) => {
    const { email, password } = event.body;

    try {
        const adminInitiateAuthCommand = new AdminInitiateAuthCommand({
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID,
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        });
        const data = await cognitoIdentityProviderClient.send(
            adminInitiateAuthCommand
        );

        console.log("Successfully logged in with email:", data);

        if (!data.AuthenticationResult || !data.AuthenticationResult.IdToken) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    ChallengeName: data.ChallengeName,
                    ChallengeParameters: data.ChallengeParameters,
                    Session: data.Session,
                }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data.AuthenticationResult),
        };
    } catch (err: any) {
        console.error("Error logging in with email:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
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
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: EmailLoginSchema }))
    .use(cors());

export const refreshTokens = middy(async (event: RefreshTokensData) => {
    const { refreshToken } = event.body;

    try {
        const initiateAuthCommand = new InitiateAuthCommand({
            ClientId: USER_POOL_CLIENT_ID,
            AuthFlow: "REFRESH_TOKEN_AUTH",
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
            },
        });
        const data = await cognitoIdentityProviderClient.send(
            initiateAuthCommand
        );

        console.log("Successfully refreshed token:", data);

        if (!data.AuthenticationResult) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    ChallengeName: data.ChallengeName,
                    ChallengeParameters: data.ChallengeParameters,
                    Session: data.Session,
                }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data.AuthenticationResult),
        };
    } catch (err: any) {
        console.error("Error refreshing token:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
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
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: RefreshTokensSchema }))
    .use(cors());

async function verifyGoogleToken(token: string) {
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        console.log("Google token payload:", JSON.stringify(payload, null, 2));
        console.log("Google token user ID:", ticket.getUserId());

        return ticket.getPayload();
    } catch (err) {
        console.error("Error verifying Google token:", err);
        throw new Error(err);
    }
}

async function cognitoUserExists(email: string) {
    try {
        const getUserCommand = new AdminGetUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
        });
        await cognitoIdentityProviderClient.send(getUserCommand);

        return true;
    } catch (err) {
        if (err.name === "UserNotFoundException") return false;

        throw err;
    }
}

export const googleSignIn = middy(async (event: GoogleSignInData) => {
    const { idToken } = event.body;

    try {
        // Validate ID Token With Google
        const payload = await verifyGoogleToken(idToken);

        console.log("payload", payload);

        if (!payload) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    error: ERRORS.GOOGLE_ID_TOKEN.INVALID.CODE,
                    message: payload,
                }),
            };
        }

        const decodedToken: any = jwtDecode(idToken);

        console.log("decodedToken", decodedToken);

        // Check if the user already exists in the user pool
        const userExists = await cognitoUserExists(decodedToken.email);

        if (userExists) {
            const initiateAuthCommand = new AdminInitiateAuthCommand({
                UserPoolId: USER_POOL_ID,
                ClientId: USER_POOL_CLIENT_ID,
                AuthFlow: "ADMIN_NO_SRP_AUTH",
                AuthParameters: {
                    USERNAME: decodedToken.email,
                    PASSWORD: "X&NEq##tr7Mf4j3a",
                },
            });
            const { AuthenticationResult } =
                await cognitoIdentityProviderClient.send(initiateAuthCommand);

            console.log("AuthenticationResult", AuthenticationResult);

            return {
                statusCode: 200,
                body: JSON.stringify(AuthenticationResult),
            };
        }

        // Create the user in the user pool
        const createUserCommand = new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
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
        const newUser = await cognitoIdentityProviderClient.send(
            createUserCommand
        );
        const sub = newUser.User?.Attributes?.find(
            (attr) => attr.Name === "sub"
        )?.Value;

        if (sub) {
            // Create the user in the database
            await db.users.create({
                id: sub,
                email: decodedToken.email,
                authProvider: "google",
            });
        }

        // Set permanent password for user
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username: decodedToken.email,
            Password: "X&NEq##tr7Mf4j3a",
            Permanent: true,
        });
        await cognitoIdentityProviderClient.send(setPasswordCommand);

        // Link the user to the Google provider
        const linkCommand = new AdminLinkProviderForUserCommand({
            UserPoolId: USER_POOL_ID,
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
        await cognitoIdentityProviderClient.send(linkCommand);

        // Initiate Auth With Cognito
        const initiateAuthCommand = new AdminInitiateAuthCommand({
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID,
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            AuthParameters: {
                USERNAME: decodedToken.email,
                PASSWORD: "X&NEq##tr7Mf4j3a",
            },
        });
        const { AuthenticationResult } =
            await cognitoIdentityProviderClient.send(initiateAuthCommand);

        console.log("response", AuthenticationResult);

        return {
            statusCode: 200,
            body: JSON.stringify(AuthenticationResult),
        };
    } catch (err: any) {
        console.error("Error during google sign in:", err);

        if (err.message) {
            return {
                statusCode: err.statusCode,
                body: JSON.stringify({
                    error: err.__type,
                    message: err.message,
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
})
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: GoogleSignInSchema }))
    .use(cors());
