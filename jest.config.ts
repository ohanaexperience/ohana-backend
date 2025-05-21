module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "js", "json"],
    transform: {
        "^.+\\.ts$": "ts-jest",
    },
    testMatch: ["**/tests/**/*.test.ts"],
    moduleNameMapper: {
        "^src/(.*)$": "<rootDir>/src/$1",
    },
    transformIgnorePatterns: ["node_modules/(?!(stripe|@middy)/)"],
};
