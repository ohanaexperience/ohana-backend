declare global {
    namespace NodeJS {
        interface ProcessEnv {
            SERVICE: string;
            NODE_ENV: string;
            USER_POOL_CLIENT_ID: string;
            DATABASE_URL: string;
            STRIPE_SECRET_KEY: string;
            STRIPE_IDENTITY_WEBHOOK_SECRET: string;
            STRIPE_PAYMENT_WEBHOOK_SECRET: string;
            TWILIO_ACCOUNT_SID: string;
            TWILIO_AUTH_TOKEN: string;
            DB_ENDPOINT: string;
            DB_PORT: string;
            DB_NAME: string;
            DB_USER: string;
            DB_PASSWORD: string;
        }
    }
}

export {};
