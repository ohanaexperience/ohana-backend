import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { OAuth2Client } from "google-auth-library";

import Postgres from "@/database/postgres";

export interface AuthServiceOptions {
    // Dependencies
    database: Postgres;
    cognitoClient: CognitoIdentityProviderClient;
    googleClient: OAuth2Client;

    // Config
    userPoolClientId: string;
    userPoolId: string;
    googleClientId: string;
}
