import middy from "@middy/core";
import cors from "@middy/http-cors";
import { jwtDecode } from "jwt-decode";
import { OAuth2Client } from "google-auth-library";

import {
    CognitoIdentityClient,
    GetCredentialsForIdentityCommand,
    GetIdCommand,
} from "@aws-sdk/client-cognito-identity";
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
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

import { APIGatewayEvent } from "aws-lambda";

const {
    USER_POOL_ID,
    USER_POOL_CLIENT_ID,
    IDENTITY_POOL_ID,
    GOOGLE_CLIENT_ID,
} = process.env;

const snsClient = new SNSClient({ region: "us-east-1" });
const cognitoIdentityClient = new CognitoIdentityClient({
    region: "us-east-1",
});
const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({
    region: "us-east-1",
});
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const phoneRegister = middy(async (event: APIGatewayEvent) => {
    console.log("user pool id", USER_POOL_ID);
    console.log("user pool client id", USER_POOL_CLIENT_ID);

    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { phoneNumber } = JSON.parse(event.body);

    if (!phoneNumber) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing phone number",
                message: "Phone number is required.",
            }),
        };
    }

    try {
        const signUpCommand = new SignUpCommand({
            ClientId: USER_POOL_CLIENT_ID,
            Username: phoneNumber,
            Password: "Temp2425%",
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
}).use(cors());

export const emailRegister = middy(async (event: APIGatewayEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { email, password } = JSON.parse(event.body);

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing email",
                message: "Email is required.",
            }),
        };
    }

    if (!password) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing password",
                message: "Password is required.",
            }),
        };
    }

    try {
        const signUpCommand = new SignUpCommand({
            ClientId: USER_POOL_CLIENT_ID,
            Username: email,
            Password: password,
            // UserAttributes: [
            //     {
            //         Name: "phone_number",
            //         Value: phoneNumber,
            //     },
            // ],
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
}).use(cors());

export const emailResendCode = middy(async (event: APIGatewayEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { email } = JSON.parse(event.body);

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing email",
                message: "Email is required.",
            }),
        };
    }

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
}).use(cors());

export const emailConfirmCode = middy(async (event: APIGatewayEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { email, confirmationCode } = JSON.parse(event.body);

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing email",
                message: "Email is required.",
            }),
        };
    }

    if (!confirmationCode) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing confirmation code",
                message: "Confirmation code is required.",
            }),
        };
    }

    try {
        const confirmSignUpCommand = new ConfirmSignUpCommand({
            ClientId: USER_POOL_CLIENT_ID,
            Username: email,
            ConfirmationCode: confirmationCode,
        });
        const response = await cognitoIdentityProviderClient.send(
            confirmSignUpCommand
        );

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
}).use(cors());

export const forgotPassword = middy(async (event: APIGatewayEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { email } = JSON.parse(event.body);

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing email",
                message: "Email is required.",
            }),
        };
    }

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
}).use(cors());

export const confirmForgotPassword = middy(async (event: APIGatewayEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { email, newPassword, confirmationCode } = JSON.parse(event.body);

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing email",
                message: "Email is required.",
            }),
        };
    }

    if (!newPassword) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing new password",
                message: "New password is required.",
            }),
        };
    }

    if (!confirmationCode) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing confirmation code",
                message: "Confirmation code is required.",
            }),
        };
    }

    try {
        const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
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
}).use(cors());

export const emailLogin = middy(async (event: APIGatewayEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { email, password } = JSON.parse(event.body);

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing email",
                message: "Email is required.",
            }),
        };
    }

    if (!password) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing new password",
                message: "New password is required.",
            }),
        };
    }

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
}).use(cors());

export const refreshTokens = middy(async (event: APIGatewayEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { refreshToken } = JSON.parse(event.body);

    if (!refreshToken) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing refresh token",
                message: "Refresh token is required.",
            }),
        };
    }

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
}).use(cors());

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

export const googleSignIn = middy(async (event: APIGatewayEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing request body",
                message: "A request body is required.",
            }),
        };
    }

    const { idToken } = JSON.parse(event.body);

    if (!idToken) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Missing id token",
                message: "Id token is required.",
            }),
        };
    }

    try {
        // Validate ID Token With Google
        const payload = await verifyGoogleToken(idToken);

        console.log("payload", payload);

        if (!payload) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    error: "Invalid token",
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
        await cognitoIdentityProviderClient.send(createUserCommand);

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
}).use(cors());
