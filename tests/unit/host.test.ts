import { HostController } from "@/host/controllers/host";
import { decodeToken } from "@/utils";
import { DecodedIdToken } from "@/types";
import ERRORS from "@/errors";

jest.mock("@/utils", () => ({
    decodeToken: jest.fn(),
}));

describe("Host Profile Controller", () => {
    let hostController: HostController;
    let mockDatabase: any;
    let mockDecodeToken: jest.MockedFunction<typeof decodeToken>;

    beforeEach(() => {
        mockDatabase = {
            hostVerifications: {
                getByUserId: jest.fn(),
            },
            hosts: {
                getByUserId: jest.fn(),
                update: jest.fn(),
            },
        };

        mockDecodeToken = decodeToken as jest.MockedFunction<typeof decodeToken>;

        hostController = new HostController({
            database: mockDatabase,
        });

        jest.clearAllMocks();
    });

    describe("getProfile", () => {

        it("should return host profile successfully", async () => {
            const mockHostVerification = { id: "hv123", userId: "user123" };
            const mockHost = {
                id: "host123",
                userId: "user123",
                bio: "Test bio",
                languages: ["en", "es"],
                createdAt: new Date(),
                updatedAt: new Date(),
                someNullField: null,
            };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);

            const result = await hostController.getProfile({ authorization: "Bearer token" });

            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody).toEqual({
                userId: "user123",
                bio: "Test bio",
                languages: ["en", "es"],
            });
            expect(responseBody.createdAt).toBeUndefined();
            expect(responseBody.updatedAt).toBeUndefined();
            expect(responseBody.someNullField).toBeUndefined();
        });

        it("should return 500 when authorization is empty", async () => {
            mockDecodeToken.mockImplementation(() => {
                throw new Error("Invalid token");
            });

            const result = await hostController.getProfile({ authorization: "" });

            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).error).toBe("Internal server error");
        });

        it("should return 400 when host verification not found", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hostVerifications.getByUserId.mockResolvedValue(null);

            const result = await hostController.getProfile({ authorization: "Bearer token" });

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE);
        });

        it("should return 400 when host not found", async () => {
            const mockHostVerification = { id: "hv123", userId: "user123" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
            mockDatabase.hosts.getByUserId.mockResolvedValue(null);

            const result = await hostController.getProfile({ authorization: "Bearer token" });

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(ERRORS.HOST.NOT_FOUND.CODE);
        });

        it("should handle internal server errors", async () => {
            mockDecodeToken.mockImplementation(() => {
                throw new Error("Token decode error");
            });

            const result = await hostController.getProfile({ authorization: "Bearer token" });

            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).error).toBe("Internal server error");
            expect(JSON.parse(result.body).message).toBe("An unexpected error occurred");
        });

        it("should handle unexpected errors", async () => {
            mockDecodeToken.mockImplementation(() => {
                throw "Unexpected error";
            });

            const result = await hostController.getProfile({ authorization: "Bearer token" });

            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).error).toBe("Internal server error");
            expect(JSON.parse(result.body).message).toBe("An unexpected error occurred");
        });
    });

    describe("updateProfile", () => {

        it("should update host profile successfully", async () => {
            const mockHostVerification = { id: "hv123", userId: "user123" };
            const mockHost = { id: "host123", userId: "user123" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.hosts.update.mockResolvedValue(undefined);

            const result = await hostController.updateProfile({
                authorization: "Bearer token",
                bio: "Updated bio",
                languages: ["en", "fr"],
            });

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).message).toBe("Host profile updated successfully.");
            expect(mockDatabase.hosts.update).toHaveBeenCalledWith("user123", {
                bio: "Updated bio",
                languages: ["en", "fr"],
            });
        });

        it("should return 500 when authorization is invalid", async () => {
            mockDecodeToken.mockImplementation(() => {
                throw new Error("Invalid token");
            });

            const result = await hostController.updateProfile({
                authorization: "invalid",
                bio: "Updated bio",
                languages: ["en", "fr"],
            });

            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).error).toBe("Internal server error");
        });

        it("should return 400 when host verification not found", async () => {
            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hostVerifications.getByUserId.mockResolvedValue(null);

            const result = await hostController.updateProfile({
                authorization: "Bearer token",
                bio: "Updated bio",
                languages: ["en", "fr"],
            });

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(ERRORS.HOST_VERIFICATION.NOT_VERIFIED.CODE);
        });

        it("should return 400 when host not found", async () => {
            const mockHostVerification = { id: "hv123", userId: "user123" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
            mockDatabase.hosts.getByUserId.mockResolvedValue(null);

            const result = await hostController.updateProfile({
                authorization: "Bearer token",
                bio: "Updated bio",
                languages: ["en", "fr"],
            });

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe(ERRORS.HOST.NOT_FOUND.CODE);
        });

        it("should handle database errors", async () => {
            const mockHostVerification = { id: "hv123", userId: "user123" };
            const mockHost = { id: "host123", userId: "user123" };
            const mockError = {
                message: "Database error",
                statusCode: 400,
                __type: "DatabaseException",
            };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.hosts.update.mockRejectedValue(mockError);

            const result = await hostController.updateProfile({
                authorization: "Bearer token",
                bio: "Updated bio",
                languages: ["en", "fr"],
            });

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toBe("DatabaseException");
            expect(JSON.parse(result.body).message).toBe("Database error");
        });

        it("should handle internal server errors", async () => {
            const mockHostVerification = { id: "hv123", userId: "user123" };
            const mockHost = { id: "host123", userId: "user123" };

            mockDecodeToken.mockReturnValue({ sub: "user123" } as DecodedIdToken);
            mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
            mockDatabase.hosts.getByUserId.mockResolvedValue(mockHost);
            mockDatabase.hosts.update.mockRejectedValue(new Error("Unexpected error"));

            const result = await hostController.updateProfile({
                authorization: "Bearer token",
                bio: "Updated bio",
                languages: ["en", "fr"],
            });

            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).error).toBe("Internal server error");
        });
    });
});