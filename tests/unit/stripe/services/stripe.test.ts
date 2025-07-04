import { StripeService } from "@/stripe/services/stripe";
import { StripeServiceOptions } from "@/stripe/types";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";
import dayjs from "dayjs";
import stripe from "stripe";

jest.mock("@/utils");
jest.mock("dayjs", () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock("stripe");

describe("StripeService", () => {
    let stripeService: StripeService;
    let mockDatabase: any;
    let mockStripeClient: any;
    let mockOptions: StripeServiceOptions;

    beforeEach(() => {
        mockDatabase = {
            hostVerifications: {
                getByUserId: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        };

        mockStripeClient = {
            identity: {
                verificationSessions: {
                    create: jest.fn(),
                    retrieve: jest.fn(),
                },
            },
            ephemeralKeys: {
                create: jest.fn(),
            },
        };

        mockOptions = {
            database: mockDatabase,
            stripeClient: mockStripeClient,
        };

        stripeService = new StripeService(mockOptions);

        (decodeToken as jest.Mock).mockReturnValue({ sub: "test-user-id" });
        (dayjs as jest.MockedFunction<typeof dayjs>).mockReturnValue({
            unix: jest.fn().mockReturnValue(1704067200),
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("createVerificationSession", () => {
        const mockRequest = {
            authorization: "Bearer valid-jwt-token",
        };

        describe("new user verification", () => {
            it("should create new verification session for user without existing verification", async () => {
                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(null);

                const mockSession = {
                    id: "vs_1234567890",
                    client_secret: "vs_1234567890_secret_abcdef",
                    type: "document",
                    status: "requires_input",
                };

                const mockEphemeralKey = {
                    id: "ek_test_1234567890",
                    secret: "ek_test_1234567890_secret",
                    expires: 1704067800,
                };

                mockStripeClient.identity.verificationSessions.create.mockResolvedValue(mockSession);
                mockStripeClient.ephemeralKeys.create.mockResolvedValue(mockEphemeralKey);

                const result = await stripeService.createVerificationSession(mockRequest);

                expect(decodeToken).toHaveBeenCalledWith("Bearer valid-jwt-token");
                expect(mockDatabase.hostVerifications.getByUserId).toHaveBeenCalledWith("test-user-id");
                expect(mockStripeClient.identity.verificationSessions.create).toHaveBeenCalledWith({
                    type: "document",
                    metadata: { user_id: "test-user-id" },
                    options: {
                        document: {
                            allowed_types: ["driving_license", "id_card", "passport"],
                            require_matching_selfie: true,
                        },
                    },
                }, expect.objectContaining({
                    idempotencyKey: expect.stringMatching(/^verification_test-user-id_\d+$/)
                }));
                expect(mockStripeClient.ephemeralKeys.create).toHaveBeenCalledWith(
                    { verification_session: "vs_1234567890" },
                    { apiVersion: "2025-04-30.basil" }
                );
                expect(mockDatabase.hostVerifications.create).toHaveBeenCalledWith({
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    providerData: { verificationSession: mockSession, ephemeralKey: mockEphemeralKey },
                    status: "pending",
                    submittedAt: expect.any(Date),
                });

                expect(result).toEqual({
                    clientSecret: "vs_1234567890_secret_abcdef",
                    ephemeralKey: "ek_test_1234567890_secret",
                });
            });

            it("should throw error if verification session creation fails", async () => {
                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(null);

                const mockSession = {
                    id: "vs_1234567890",
                    client_secret: null,
                    type: "document",
                    status: "requires_input",
                };

                mockStripeClient.identity.verificationSessions.create.mockResolvedValue(mockSession);

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow(
                    ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE
                );
            });

            it("should throw error if ephemeral key creation fails", async () => {
                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(null);

                const mockSession = {
                    id: "vs_1234567890",
                    client_secret: "vs_1234567890_secret_abcdef",
                    type: "document",
                    status: "requires_input",
                };

                const mockEphemeralKey = {
                    id: "ek_test_1234567890",
                    secret: null,
                    expires: 1704067800,
                };

                mockStripeClient.identity.verificationSessions.create.mockResolvedValue(mockSession);
                mockStripeClient.ephemeralKeys.create.mockResolvedValue(mockEphemeralKey);

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow(
                    ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE
                );
            });
        });

        describe("existing user verification", () => {
            it("should return message for already approved verification", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "approved",
                    providerData: {
                        verificationSession: { id: "vs_1234567890" },
                        ephemeralKey: { secret: "ek_test_1234567890_secret" },
                    },
                };

                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);

                const result = await stripeService.createVerificationSession(mockRequest);

                expect(result).toEqual({
                    message: "Host is already verified.",
                });
            });

            it("should return existing session data when ephemeral key is still valid", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: {
                        verificationSession: {
                            id: "vs_1234567890",
                            client_secret: "vs_1234567890_secret_abcdef",
                        },
                        ephemeralKey: {
                            id: "ek_test_1234567890",
                            secret: "ek_test_1234567890_secret",
                            expires: 1704067800,
                        },
                    },
                };

                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
                mockStripeClient.identity.verificationSessions.retrieve.mockResolvedValue({
                    id: "vs_1234567890",
                    client_secret: "vs_1234567890_secret_abcdef",
                });

                const result = await stripeService.createVerificationSession(mockRequest);

                expect(mockStripeClient.identity.verificationSessions.retrieve).toHaveBeenCalledWith("vs_1234567890");
                expect(result).toEqual({
                    clientSecret: "vs_1234567890_secret_abcdef",
                    ephemeralKey: "ek_test_1234567890_secret",
                });
            });

            it("should refresh ephemeral key when expired", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: {
                        verificationSession: {
                            id: "vs_1234567890",
                            client_secret: "vs_1234567890_secret_abcdef",
                        },
                        ephemeralKey: {
                            id: "ek_test_1234567890",
                            secret: "ek_test_1234567890_secret",
                            expires: 1704067000,
                        },
                    },
                };

                const mockNewEphemeralKey = {
                    id: "ek_test_new_key",
                    secret: "ek_test_new_key_secret",
                    expires: 1704067900,
                };

                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
                mockStripeClient.identity.verificationSessions.retrieve.mockResolvedValue({
                    id: "vs_1234567890",
                    client_secret: "vs_1234567890_secret_abcdef",
                });
                mockStripeClient.ephemeralKeys.create.mockResolvedValue(mockNewEphemeralKey);

                const result = await stripeService.createVerificationSession(mockRequest);

                expect(mockStripeClient.identity.verificationSessions.retrieve).toHaveBeenCalledWith("vs_1234567890");
                expect(mockStripeClient.ephemeralKeys.create).toHaveBeenCalledWith(
                    { verification_session: "vs_1234567890" },
                    { apiVersion: "2025-04-30.basil" }
                );

                expect(mockDatabase.hostVerifications.update).toHaveBeenCalledWith("test-user-id", {
                    providerData: {
                        ...mockHostVerification.providerData,
                        ephemeralKey: mockNewEphemeralKey,
                    },
                });

                expect(result).toEqual({
                    clientSecret: "vs_1234567890_secret_abcdef",
                    ephemeralKey: "ek_test_new_key_secret",
                });
            });

            it("should throw error if existing verification has no provider data", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: null,
                };

                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow(
                    ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND.CODE
                );
            });

            it("should create new session when existing session is redacted", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: {
                        verificationSession: {
                            id: "vs_redacted_session",
                            client_secret: "vs_redacted_secret",
                        },
                        ephemeralKey: {
                            id: "ek_test_1234567890",
                            secret: "ek_test_1234567890_secret",
                            expires: 1704067800,
                        },
                    },
                };

                const redactedError = {
                    type: 'StripeInvalidRequestError',
                    code: 'resource_missing',
                    message: "You attempted to retrieve a redacted verificationintent with token 'vs_redacted_session'.",
                };

                const mockNewSession = {
                    id: "vs_new_session",
                    client_secret: "vs_new_session_secret",
                    type: "document",
                    status: "requires_input",
                };

                const mockNewEphemeralKey = {
                    id: "ek_new_session",
                    secret: "ek_new_session_secret",
                    expires: 1704067900,
                };

                mockDatabase.hostVerifications.getByUserId
                    .mockResolvedValueOnce(mockHostVerification)  // First call in main method
                    .mockResolvedValue(mockHostVerification);     // Second call in createNewVerification
                mockStripeClient.identity.verificationSessions.retrieve.mockRejectedValue(redactedError);
                mockStripeClient.identity.verificationSessions.create.mockResolvedValue(mockNewSession);
                mockStripeClient.ephemeralKeys.create.mockResolvedValue(mockNewEphemeralKey);

                const result = await stripeService.createVerificationSession(mockRequest);

                expect(mockStripeClient.identity.verificationSessions.retrieve).toHaveBeenCalledWith("vs_redacted_session");
                expect(mockStripeClient.identity.verificationSessions.create).toHaveBeenCalled();
                expect(mockDatabase.hostVerifications.update).toHaveBeenCalled();
                expect(result).toEqual({
                    clientSecret: "vs_new_session_secret",
                    ephemeralKey: "ek_new_session_secret",
                });
            });

            it("should update existing verification when record exists during new verification creation", async () => {
                const mockExistingVerification = {
                    id: "hv_existing",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                };

                const mockNewSession = {
                    id: "vs_new_session",
                    client_secret: "vs_new_session_secret",
                    type: "document",
                    status: "requires_input",
                };

                const mockNewEphemeralKey = {
                    id: "ek_new_session",
                    secret: "ek_new_session_secret",
                    expires: 1704067900,
                };

                mockDatabase.hostVerifications.getByUserId
                    .mockResolvedValueOnce(null)  // No verification in main method (triggers new verification)
                    .mockResolvedValue(mockExistingVerification);  // Verification exists in createNewVerification
                mockStripeClient.identity.verificationSessions.create.mockResolvedValue(mockNewSession);
                mockStripeClient.ephemeralKeys.create.mockResolvedValue(mockNewEphemeralKey);

                const result = await stripeService.createVerificationSession(mockRequest);

                expect(mockStripeClient.identity.verificationSessions.create).toHaveBeenCalled();
                expect(mockDatabase.hostVerifications.update).toHaveBeenCalledWith("test-user-id", {
                    provider: "stripe_identity",
                    providerData: { verificationSession: mockNewSession, ephemeralKey: mockNewEphemeralKey },
                    status: "pending",
                    submittedAt: expect.any(Date),
                });
                expect(mockDatabase.hostVerifications.create).not.toHaveBeenCalled();
                expect(result).toEqual({
                    clientSecret: "vs_new_session_secret",
                    ephemeralKey: "ek_new_session_secret",
                });
            });

            it("should create new verification when no existing record exists", async () => {
                const mockNewSession = {
                    id: "vs_new_session",
                    client_secret: "vs_new_session_secret",
                    type: "document",
                    status: "requires_input",
                };

                const mockNewEphemeralKey = {
                    id: "ek_new_session",
                    secret: "ek_new_session_secret",
                    expires: 1704067900,
                };

                mockDatabase.hostVerifications.getByUserId
                    .mockResolvedValueOnce(null)  // No existing verification
                    .mockResolvedValue(null);     // Still no verification in createNewVerification
                mockStripeClient.identity.verificationSessions.create.mockResolvedValue(mockNewSession);
                mockStripeClient.ephemeralKeys.create.mockResolvedValue(mockNewEphemeralKey);

                const result = await stripeService.createVerificationSession(mockRequest);

                expect(mockStripeClient.identity.verificationSessions.create).toHaveBeenCalled();
                expect(mockDatabase.hostVerifications.create).toHaveBeenCalled();
                expect(mockDatabase.hostVerifications.update).not.toHaveBeenCalled();
                expect(result).toEqual({
                    clientSecret: "vs_new_session_secret",
                    ephemeralKey: "ek_new_session_secret",
                });
            });

            it("should create new session when ephemeral key refresh fails due to redacted session", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: {
                        verificationSession: {
                            id: "vs_redacted_session",
                            client_secret: "vs_redacted_secret",
                        },
                        ephemeralKey: {
                            id: "ek_test_1234567890",
                            secret: "ek_test_1234567890_secret",
                            expires: 1704067000, // Expired
                        },
                    },
                };

                const redactedError = {
                    type: 'StripeInvalidRequestError',
                    code: 'resource_missing',
                    message: "You attempted to retrieve a redacted verificationintent with token 'vs_redacted_session'.",
                };

                const mockNewSession = {
                    id: "vs_new_session",
                    client_secret: "vs_new_session_secret",
                    type: "document",
                    status: "requires_input",
                };

                const mockNewEphemeralKey = {
                    id: "ek_new_session",
                    secret: "ek_new_session_secret",
                    expires: 1704067900,
                };

                mockDatabase.hostVerifications.getByUserId
                    .mockResolvedValueOnce(mockHostVerification)  // First call in main method
                    .mockResolvedValue(mockHostVerification);     // Second call in createNewVerification
                mockStripeClient.identity.verificationSessions.retrieve.mockResolvedValue({
                    id: "vs_redacted_session",
                    client_secret: "vs_redacted_secret",
                });
                mockStripeClient.ephemeralKeys.create
                    .mockRejectedValueOnce(redactedError)  // First call fails with redacted error
                    .mockResolvedValue(mockNewEphemeralKey);  // Second call succeeds for new session
                mockStripeClient.identity.verificationSessions.create.mockResolvedValue(mockNewSession);

                const result = await stripeService.createVerificationSession(mockRequest);

                expect(mockStripeClient.identity.verificationSessions.create).toHaveBeenCalled();
                expect(mockDatabase.hostVerifications.update).toHaveBeenCalled();
                expect(result).toEqual({
                    clientSecret: "vs_new_session_secret",
                    ephemeralKey: "ek_new_session_secret",
                });
            });
        });

        describe("ephemeral key expiration logic", () => {
            it("should consider key expired when expires time is within buffer", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: {
                        verificationSession: {
                            id: "vs_1234567890",
                            client_secret: "vs_1234567890_secret_abcdef",
                        },
                        ephemeralKey: {
                            id: "ek_test_1234567890",
                            secret: "ek_test_1234567890_secret",
                            expires: 1704067400,
                        },
                    },
                };

                const mockNewEphemeralKey = {
                    id: "ek_test_new_key",
                    secret: "ek_test_new_key_secret",
                    expires: 1704067900,
                };

                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
                mockStripeClient.identity.verificationSessions.retrieve.mockResolvedValue({
                    id: "vs_1234567890",
                    client_secret: "vs_1234567890_secret_abcdef",
                });
                mockStripeClient.ephemeralKeys.create.mockResolvedValue(mockNewEphemeralKey);

                await stripeService.createVerificationSession(mockRequest);

                expect(mockStripeClient.ephemeralKeys.create).toHaveBeenCalled();
                expect(mockDatabase.hostVerifications.update).toHaveBeenCalled();
            });

            it("should not refresh key when expires time is beyond buffer", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: {
                        verificationSession: {
                            id: "vs_1234567890",
                            client_secret: "vs_1234567890_secret_abcdef",
                        },
                        ephemeralKey: {
                            id: "ek_test_1234567890",
                            secret: "ek_test_1234567890_secret",
                            expires: 1704067600,
                        },
                    },
                };

                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);
                mockStripeClient.identity.verificationSessions.retrieve.mockResolvedValue({
                    id: "vs_1234567890",
                    client_secret: "vs_1234567890_secret_abcdef",
                });

                await stripeService.createVerificationSession(mockRequest);

                expect(mockStripeClient.ephemeralKeys.create).not.toHaveBeenCalled();
                expect(mockDatabase.hostVerifications.update).not.toHaveBeenCalled();
            });
        });

        describe("error handling", () => {
            it("should handle invalid JWT token", async () => {
                (decodeToken as jest.Mock).mockImplementation(() => {
                    throw new Error("Invalid token");
                });

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow("Invalid token");
            });

            it("should handle database errors", async () => {
                mockDatabase.hostVerifications.getByUserId.mockRejectedValue(new Error("Database connection error"));

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow("Database connection error");
            });

            it("should handle Stripe API errors", async () => {
                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(null);
                mockStripeClient.identity.verificationSessions.create.mockRejectedValue(new Error("Stripe API error"));

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow("Stripe API error");
            });

            it("should handle ephemeral key creation errors", async () => {
                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(null);

                const mockSession = {
                    id: "vs_1234567890",
                    client_secret: "vs_1234567890_secret_abcdef",
                    type: "document",
                    status: "requires_input",
                };

                mockStripeClient.identity.verificationSessions.create.mockResolvedValue(mockSession);
                mockStripeClient.ephemeralKeys.create.mockRejectedValue(new Error("Ephemeral key creation failed"));

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow("Ephemeral key creation failed");
            });
        });

        describe("edge cases", () => {
            it("should handle undefined providerData fields", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: {
                        verificationSession: undefined,
                        ephemeralKey: undefined,
                    },
                };

                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow();
            });

            it("should handle malformed providerData", async () => {
                const mockHostVerification = {
                    id: "hv_1234567890",
                    userId: "test-user-id",
                    provider: "stripe_identity",
                    status: "pending",
                    providerData: "invalid-json-string",
                };

                mockDatabase.hostVerifications.getByUserId.mockResolvedValue(mockHostVerification);

                await expect(stripeService.createVerificationSession(mockRequest)).rejects.toThrow();
            });
        });
    });

    describe("constructor", () => {
        it("should initialize with provided options", () => {
            const customOptions = {
                database: { custom: "database" } as any,
                stripeClient: { custom: "stripeClient" } as any,
            };

            const customStripeService = new StripeService(customOptions);

            expect(customStripeService).toBeInstanceOf(StripeService);
        });
    });
});