// Set up test environment variables
process.env.POSTGRES_HOST = "localhost";
process.env.POSTGRES_PORT = "5432";
process.env.POSTGRES_DB = "test_db";
process.env.POSTGRES_USERNAME = "test_user";
process.env.POSTGRES_PASSWORD = "test_password";
process.env.POSTGRES_SSL = "false";

// Mock middy modules
jest.mock("@middy/core", () => {
    return jest.fn().mockImplementation((handler) => ({
        use: jest.fn().mockReturnThis(),
        handler,
    }));
});

jest.mock("@middy/http-header-normalizer", () => jest.fn());
jest.mock("@middy/http-json-body-parser", () => jest.fn());
jest.mock("@middy/http-cors", () => jest.fn());

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn(),
}));

// Mock dayjs
jest.mock("dayjs", () => {
    const mockDayjs = () => ({
        tz: jest.fn().mockReturnValue({
            toDate: jest.fn().mockReturnValue(new Date()),
        }),
    });
    mockDayjs.extend = jest.fn();
    return mockDayjs;
});