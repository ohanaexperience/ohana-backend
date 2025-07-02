import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

import { OAuth2Client } from "google-auth-library";

import { AuthController } from "../../controllers/auth";
import { EmailResendCodeData, EmailResendCodeSchema } from "../../validations";

import { DatabaseFactory } from "@/database";
import { createDatabaseConfig } from "@/database/proxy-config";
import { requireBody, zodValidator } from "@/middleware";

const {
    USER_POOL_ID,
    USER_POOL_CLIENT_ID,
    GOOGLE_CLIENT_ID,
} = process.env;

const dbConfig = createDatabaseConfig();
const db = DatabaseFactory.create({ postgres: dbConfig });
const cognitoClient = new CognitoIdentityProviderClient({
    region: "us-east-1",
});
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID!);
const authController = new AuthController({
    database: db,
    cognitoClient,
    googleClient,
    userPoolId: USER_POOL_ID!,
    userPoolClientId: USER_POOL_CLIENT_ID!,
    googleClientId: GOOGLE_CLIENT_ID!,
});

export const handler = middy(async (event: EmailResendCodeData) => {
    console.log("event", event);

    return await authController.emailResendCode(event.body);
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: EmailResendCodeSchema }))
    .use(cors());
