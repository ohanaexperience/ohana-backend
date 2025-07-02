export type DecodedIdToken = {
    sub: string;
    email_verified: boolean;
    iss: string;
    "cognito:username": string;
    origin_jti: string;
    aud: string;
    identities: [
        {
            dateCreated: string;
            userId: string;
            providerName: string;
            providerType: string;
            issuer: null;
            primary: string;
        }
    ];
    event_id: string;
    token_use: string;
    auth_time: number;
    exp: number;
    iat: number;
    jti: string;
    email: string;
};
