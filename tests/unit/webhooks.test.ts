// tests/unit/webhooks.test.ts
const { stripeWebhook } = require("./webhooks");
const DatabaseFactory = require("./database/database_factory");
const stripe = require("stripe");

// Mock dependencies
jest.mock("stripe", () => {
    return jest.fn().mockImplementation(() => ({
        webhooks: {
            constructEvent: jest.fn(),
        },
    }));
});

jest.mock("./database/database_factory", () => ({
    create: jest.fn().mockReturnValue({
        hostVerifications: {
            update: jest.fn().mockResolvedValue({}),
        },
        hosts: {
            create: jest.fn().mockResolvedValue({}),
        },
    }),
}));

describe("stripeWebhook", () => {
    const mockStripeClient = new stripe("");
    const mockDb = DatabaseFactory.create({});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 when no request body is provided", async () => {
        const event = { headers: { "stripe-signature": "sig" } };

        const response = await stripeWebhook(event, {}, {});

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toBe("MISSING_REQUEST_BODY");
    });

    it("should return 400 when no stripe-signature is provided", async () => {
        const event = { body: "{}", headers: {} };

        const response = await stripeWebhook(event, {}, {});

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toBe(
            "MISSING_STRIPE_SIGNATURE"
        );
    });

    it("should handle identity verification events correctly", async () => {
        const mockEvent = {
            type: "identity.verification_session.verified",
            data: {
                object: {
                    metadata: {
                        user_id: "user123",
                    },
                },
            },
        };

        mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);

        const event = {
            body: "{}",
            headers: { "stripe-signature": "sig" },
        };

        const response = await stripeWebhook(event, {}, {});

        expect(response.statusCode).toBe(200);
        expect(mockDb.hostVerifications.update).toHaveBeenCalledWith(
            "user123",
            { status: "approved" }
        );
        expect(mockDb.hosts.create).toHaveBeenCalledWith({ id: "user123" });
    });

    it("should handle stripe errors properly", async () => {
        const stripeError = {
            statusCode: 400,
            message: "Invalid signature",
            __type: "StripeSignatureVerificationError",
        };

        mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
            throw stripeError;
        });

        const event = {
            body: "{}",
            headers: { "stripe-signature": "invalid-sig" },
        };

        const response = await stripeWebhook(event, {}, {});

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toBe(
            "StripeSignatureVerificationError"
        );
    });

    it("should handle unexpected errors properly", async () => {
        mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
            throw new Error();
        });

        const event = {
            body: "{}",
            headers: { "stripe-signature": "sig" },
        };

        const response = await stripeWebhook(event, {}, {});

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body).error).toBe("Internal server error");
    });
});
