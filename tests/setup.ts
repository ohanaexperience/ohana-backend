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