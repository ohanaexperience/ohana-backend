declare global {
    namespace NodeJS {
        interface ProcessEnv {
            SERVICE: string;
            NODE_ENV: string;
            USER_POOL_CLIENT_ID: string;
        }
    }
}

export {};
