import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";

import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

import { OAuth2Client } from "google-auth-library";

import { AuthController } from "../../controllers/auth";
import { EmailRegisterData, EmailRegisterSchema } from "../../validations";

import { DatabaseFactory } from "@/database";
import { requireBody, zodValidator } from "@/middleware";

const {
    DB_ENDPOINT,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    USER_POOL_ID,
    USER_POOL_CLIENT_ID,
    GOOGLE_CLIENT_ID,
} = process.env;

const db = DatabaseFactory.create({
    postgres: {
        host: DB_ENDPOINT!,
        port: parseInt(DB_PORT!),
        database: DB_NAME!,
        user: DB_USER!,
        password: DB_PASSWORD!,
        ssl: false,
    },
});
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

export const handler = middy(async (event: EmailRegisterData) => {
    console.log("event", event);

    return await authController.emailRegister(event.body);
})
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(requireBody())
    .use(zodValidator({ body: EmailRegisterSchema }))
    .use(cors());
