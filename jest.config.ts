module.exports = {
    projects: [
        {
            displayName: "unit",
            preset: "ts-jest",
            testEnvironment: "node",
            moduleFileExtensions: ["ts", "js", "json"],
            transform: {
                "^.+\\.ts$": "ts-jest",
            },
            testMatch: ["**/tests/unit/**/*.test.ts", "**/tests/integration/**/*.test.ts"],
            moduleNameMapper: {
                "^@/db/(.*)$": "<rootDir>/db/$1",
                "^@/(.*)$": "<rootDir>/src/$1",
                "^src/(.*)$": "<rootDir>/src/$1",
            },
            transformIgnorePatterns: ["node_modules/(?!(stripe|@middy)/)"],
            setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
            collectCoverageFrom: [
                "src/**/*.{ts,js}",
                "!src/**/*.d.ts",
                "!src/**/*.test.{ts,js}",
            ],
            haste: {
                forceNodeFilesystemAPI: true,
            },
        },
        {
            displayName: "e2e",
            preset: "ts-jest",
            testEnvironment: "node",
            moduleFileExtensions: ["ts", "js", "json"],
            transform: {
                "^.+\\.ts$": "ts-jest",
            },
            testMatch: ["**/tests/e2e/**/*.test.ts"],
            moduleNameMapper: {
                "^@/db/(.*)$": "<rootDir>/db/$1",
                "^@/(.*)$": "<rootDir>/src/$1",
                "^src/(.*)$": "<rootDir>/src/$1",
            },
            transformIgnorePatterns: ["node_modules/(?!(stripe|@middy)/)"],
            setupFilesAfterEnv: ["<rootDir>/tests/e2e/setup.ts"],
            haste: {
                forceNodeFilesystemAPI: true,
            },
        },
    ],
};
