module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "js", "json"],
    transform: {
        "^.+\\.ts$": ["ts-jest", {
            isolatedModules: true,
        }],
    },
    testMatch: ["**/tests/**/*.test.ts"],
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
};
