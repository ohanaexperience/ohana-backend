import dayjs from "dayjs";
import stripe from "stripe";
import { InferSelectModel } from "drizzle-orm";

import { StripeServiceOptions } from "../types";

import { hostVerificationsTable } from "@/database/schemas";
import Postgres from "@/database/postgres";
import { decodeToken } from "@/utils";
import ERRORS from "@/errors";

type HostVerification = InferSelectModel<typeof hostVerificationsTable>;

export class StripeService {
    private static readonly STRIPE_API_VERSION = "2025-04-30.basil";
    private static readonly EPHEMERAL_KEY_BUFFER_SECONDS = 300;

    private readonly db: Postgres;
    private readonly stripeClient: stripe;

    constructor({ database, stripeClient }: StripeServiceOptions) {
        this.db = database;
        this.stripeClient = stripeClient;
    }

    async createVerificationSession(request: { authorization: string }) {
        const { authorization } = request;

        const { sub } = decodeToken(authorization);

        const hostVerification = await this.db.hostVerifications.getByUserId(
            sub
        );

        if (!hostVerification) {
            return this.createNewVerification(sub);
        }

        if (hostVerification.status === "approved") {
            return {
                message: "Host is already verified.",
            };
        }

        return this.handleExistingVerification(hostVerification, sub);
    }

    private async createEphemeralKey(verificationSessionId: string) {
        return await this.stripeClient.ephemeralKeys.create(
            { verification_session: verificationSessionId },
            { apiVersion: StripeService.STRIPE_API_VERSION }
        );
    }

    private isEphemeralKeyExpired(expiryTime: number): boolean {
        const timeNowUnix = dayjs().unix();

        return (
            expiryTime <=
            timeNowUnix + StripeService.EPHEMERAL_KEY_BUFFER_SECONDS
        );
    }

    private async handleExistingVerification(
        hostVerification: HostVerification,
        sub: string
    ) {
        if (!hostVerification.providerData) {
            throw new Error(ERRORS.STRIPE.VERIFICATION.SESSION_NOT_FOUND.CODE);
        }

        const { verificationSession, ephemeralKey } =
            hostVerification.providerData;

        let latestEphemeralKey = ephemeralKey;

        const ephemeralKeyExpired = this.isEphemeralKeyExpired(
            ephemeralKey.expires
        );

        if (ephemeralKeyExpired) {
            const newEphemeralKey = await this.createEphemeralKey(
                verificationSession.id
            );

            await this.db.hostVerifications.update(sub, {
                providerData: {
                    ...hostVerification.providerData,
                    ephemeralKey: newEphemeralKey,
                },
            });

            latestEphemeralKey = newEphemeralKey;
        }

        return {
            clientSecret: verificationSession.client_secret,
            ephemeralKey: latestEphemeralKey.secret,
        };
    }

    private async createNewVerification(sub: string) {
        const session =
            await this.stripeClient.identity.verificationSessions.create({
                type: "document",
                metadata: { user_id: sub },
                options: {
                    document: {
                        allowed_types: [
                            "driving_license",
                            "id_card",
                            "passport",
                        ],
                        require_matching_selfie: true,
                    },
                },
            });

        const ephemeralKey = await this.createEphemeralKey(session.id);

        if (!session.client_secret || !ephemeralKey.secret) {
            throw new Error(ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE);
        }

        await this.db.hostVerifications.create({
            userId: sub,
            provider: "stripe_identity",
            providerData: { verificationSession: session, ephemeralKey },
            status: "pending",
            submittedAt: new Date(),
        });

        return {
            clientSecret: session.client_secret,
            ephemeralKey: ephemeralKey.secret,
        };
    }
}
