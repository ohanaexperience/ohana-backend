import { StripeController } from "@/stripe/controllers/stripe";
import { StripeService } from "@/stripe/services/stripe";
import { StripeServiceOptions } from "@/stripe/types";
import ERRORS from "@/errors";

jest.mock("@/stripe/services/stripe");

describe("StripeController", () => {
    let stripeController: StripeController;
    let mockStripeService: jest.Mocked<StripeService>;
    let mockOptions: StripeServiceOptions;

    beforeEach(() => {
        mockStripeService = {
            createVerificationSession: jest.fn(),
        } as any;

        mockOptions = {
            database: {} as any,
            stripeClient: {} as any,
        };

        (StripeService as jest.MockedClass<typeof StripeService>).mockImplementation(() => mockStripeService);

        stripeController = new StripeController(mockOptions);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("createVerificationSession", () => {
        const mockRequest = {
            authorization: "Bearer valid-jwt-token",
        };

        describe("successful scenarios", () => {
            it("should return 200 with client secret and ephemeral key for new verification session", async () => {
                const mockServiceResult = {
                    clientSecret: "vs_1234567890_secret_abcdef",
                    ephemeralKey: "ek_test_1234567890",
                };

                mockStripeService.createVerificationSession.mockResolvedValue(mockServiceResult);

                const result = await stripeController.createVerificationSession(mockRequest);

                expect(mockStripeService.createVerificationSession).toHaveBeenCalledWith(mockRequest);
                expect(result).toEqual({
                    statusCode: 200,
                    body: JSON.stringify(mockServiceResult),
                });
            });

            it("should return 200 with message for already verified user", async () => {
                const mockServiceResult = {
                    message: "User is already verified",
                };

                mockStripeService.createVerificationSession.mockResolvedValue(mockServiceResult);

                const result = await stripeController.createVerificationSession(mockRequest);

                expect(result).toEqual({
                    statusCode: 200,
                    body: JSON.stringify(mockServiceResult),
                });
            });

            it("should return 200 with refreshed session data", async () => {
                const mockServiceResult = {
                    clientSecret: "vs_1234567890_secret_abcdef",
                    ephemeralKey: "ek_test_new_key",
                    refreshed: true,
                };

                mockStripeService.createVerificationSession.mockResolvedValue(mockServiceResult);

                const result = await stripeController.createVerificationSession(mockRequest);

                expect(result).toEqual({
                    statusCode: 200,
                    body: JSON.stringify(mockServiceResult),
                });
            });
        });

        describe("error handling", () => {
            it("should handle VERIFICATION_SESSION_NOT_FOUND error", async () => {
                const error = new Error(ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND.CODE);
                mockStripeService.createVerificationSession.mockRejectedValue(error);

                const result = await stripeController.createVerificationSession(mockRequest);

                expect(result).toEqual({
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND.CODE,
                        message: ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND.MESSAGE,
                    }),
                });
            });

            it("should handle FAILED_TO_CREATE_VERIFICATION_SESSION error", async () => {
                const error = new Error(ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE);
                mockStripeService.createVerificationSession.mockRejectedValue(error);

                const result = await stripeController.createVerificationSession(mockRequest);

                expect(result).toEqual({
                    statusCode: 400,
                    body: JSON.stringify({
                        error: ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE,
                        message: ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.MESSAGE,
                    }),
                });
            });

            it("should handle VERIFICATION_SESSION_REDACTED error", async () => {
                const error = new Error(ERRORS.STRIPE.VERIFICATION.SESSION_REDACTED.CODE);
                mockStripeService.createVerificationSession.mockRejectedValue(error);

                const result = await stripeController.createVerificationSession(mockRequest);

                expect(result).toEqual({
                    statusCode: 409,
                    body: JSON.stringify({
                        error: ERRORS.STRIPE.VERIFICATION.SESSION_REDACTED.CODE,
                        message: ERRORS.STRIPE.VERIFICATION.SESSION_REDACTED.MESSAGE,
                    }),
                });
            });

            it("should handle unexpected errors", async () => {
                const error = new Error("Unexpected database error");
                mockStripeService.createVerificationSession.mockRejectedValue(error);

                const result = await stripeController.createVerificationSession(mockRequest);

                expect(result).toEqual({
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "Internal server error",
                        message: "An unexpected error occurred",
                    }),
                });
            });


            it("should handle errors with undefined message", async () => {
                const errorWithoutMessage = { code: "UNKNOWN_ERROR" };
                mockStripeService.createVerificationSession.mockRejectedValue(errorWithoutMessage);

                const result = await stripeController.createVerificationSession(mockRequest);

                expect(result).toEqual({
                    statusCode: 500,
                    body: JSON.stringify({
                        error: "Internal server error",
                        message: "An unexpected error occurred",
                    }),
                });
            });
        });

        describe("request validation", () => {
            it("should pass request to service unchanged", async () => {
                const mockServiceResult = {
                    clientSecret: "vs_1234567890_secret_abcdef",
                    ephemeralKey: "ek_test_1234567890",
                };

                mockStripeService.createVerificationSession.mockResolvedValue(mockServiceResult);

                await stripeController.createVerificationSession(mockRequest);

                expect(mockStripeService.createVerificationSession).toHaveBeenCalledWith(mockRequest);
                expect(mockStripeService.createVerificationSession).toHaveBeenCalledTimes(1);
            });

            it("should handle empty authorization string", async () => {
                const requestWithEmptyAuth = {
                    authorization: "",
                };

                const mockServiceResult = {
                    clientSecret: "vs_1234567890_secret_abcdef",
                    ephemeralKey: "ek_test_1234567890",
                };

                mockStripeService.createVerificationSession.mockResolvedValue(mockServiceResult);

                await stripeController.createVerificationSession(requestWithEmptyAuth);

                expect(mockStripeService.createVerificationSession).toHaveBeenCalledWith(requestWithEmptyAuth);
            });

            it("should handle undefined authorization", async () => {
                const requestWithUndefinedAuth = {
                    authorization: undefined as any,
                };

                const mockServiceResult = {
                    clientSecret: "vs_1234567890_secret_abcdef",
                    ephemeralKey: "ek_test_1234567890",
                };

                mockStripeService.createVerificationSession.mockResolvedValue(mockServiceResult);

                await stripeController.createVerificationSession(requestWithUndefinedAuth);

                expect(mockStripeService.createVerificationSession).toHaveBeenCalledWith(requestWithUndefinedAuth);
            });
        });
    });

    describe("constructor", () => {
        it("should initialize StripeService with provided options", () => {
            const customOptions: StripeServiceOptions = {
                database: { mockDatabase: true } as any,
                stripeClient: { mockStripeClient: true } as any,
            };

            new StripeController(customOptions);

            expect(StripeService).toHaveBeenCalledWith(customOptions);
        });

        it("should create a new instance of StripeService", () => {
            expect(StripeService).toHaveBeenCalledWith(mockOptions);
            expect(StripeService).toHaveBeenCalledTimes(1);
        });
    });
});