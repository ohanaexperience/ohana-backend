export type DecodedIdToken = {
    email: string;
    sub: string;
    "cognito:username": string;
    identities: [
        {
            userId: string;
            providerName: string;
            providerType: string;
            issuer: null;
            primary: string;
            dateCreated: string;
        }
    ];
};
