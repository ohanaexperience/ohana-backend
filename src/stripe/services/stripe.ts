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
        try {
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

            // Check if there's an existing session and its current status
            if (hostVerification.providerData?.verificationSession) {
                const sessionStatus = hostVerification.providerData.verificationSession.status;
                
                // Handle different session states
                switch (sessionStatus) {
                    case "verified":
                        // Update our record to reflect verification
                        await this.db.hostVerifications.update(sub, {
                            status: "approved",
                        });
                        return {
                            message: "Host is already verified.",
                        };
                    
                    case "canceled":
                        // Session was canceled, create a new one
                        console.log(`Previous verification session was canceled, creating new session for user ${sub}`);
                        return this.createNewVerification(sub);
                    
                    case "requires_input":
                        // Check if we should retry or create new session based on last_error
                        const lastError = hostVerification.providerData.verificationSession.last_error;
                        if (lastError && this.isUnrecoverableError(lastError)) {
                            console.log(`Verification session has unrecoverable error, creating new session for user ${sub}`);
                            return this.createNewVerification(sub);
                        }
                        break;
                }
            }

            return this.handleExistingVerification(hostVerification, sub);
        } catch (error: any) {
            // Catch any redacted session errors that might not be handled elsewhere
            if (this.isRedactedSessionError(error)) {
                console.log(`Redacted session error caught at top level, cleaning up and creating new session`);
                const { authorization } = request;
                const { sub } = decodeToken(authorization);
                
                // Try to clean up any existing verification record
                try {
                    const existingVerification = await this.db.hostVerifications.getByUserId(sub);
                    if (existingVerification) {
                        await this.db.hostVerifications.update(sub, {
                            status: "pending",
                            providerData: null,
                        });
                    }
                } catch (cleanupError) {
                    console.log('Error cleaning up verification record:', cleanupError);
                    // Continue with new session creation even if cleanup fails
                }
                
                return this.createNewVerification(sub);
            }
            throw error;
        }
    }

    private async createEphemeralKey(verificationSessionId: string) {
        try {
            return await this.stripeClient.ephemeralKeys.create(
                { verification_session: verificationSessionId },
                { apiVersion: StripeService.STRIPE_API_VERSION }
            );
        } catch (error: any) {
            // Re-throw the error so it can be handled by the calling function
            throw error;
        }
    }

    private isEphemeralKeyExpired(expiryTime: number): boolean {
        const timeNowUnix = dayjs().unix();

        return (
            expiryTime <=
            timeNowUnix + StripeService.EPHEMERAL_KEY_BUFFER_SECONDS
        );
    }

    private isRedactedSessionError(error: any): boolean {
        return (
            error.type === 'StripeInvalidRequestError' &&
            error.code === 'resource_missing' &&
            error.message?.includes('redacted') &&
            error.message?.includes('verificationintent')
        );
    }

    private isUnrecoverableError(lastError: any): boolean {
        // Common unrecoverable error codes that require a new session
        const unrecoverableErrors = [
            'document_expired',
            'document_type_not_supported',
            'document_failed_copy',
            'document_fraudulent',
            'document_invalid',
            'document_manipulated',
            'document_missing_back',
            'document_missing_front',
            'document_not_uploaded',
            'document_photo_mismatch',
            'selfie_document_missing_photo',
            'selfie_face_mismatch',
            'selfie_manipulated',
            'selfie_unverified_other'
        ];

        return lastError.code && unrecoverableErrors.includes(lastError.code);
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

        // Check if verification session still exists and is accessible
        try {
            const currentSession = await this.stripeClient.identity.verificationSessions.retrieve(
                verificationSession.id
            );

            // Check if session status has changed and needs different handling
            if (currentSession.status !== verificationSession.status) {
                console.log(`Session status changed from ${verificationSession.status} to ${currentSession.status} for user ${sub}`);
                
                switch (currentSession.status) {
                    case "verified":
                        await this.db.hostVerifications.update(sub, {
                            status: "approved",
                            providerData: {
                                ...hostVerification.providerData,
                                verificationSession: currentSession,
                            },
                        });
                        return {
                            message: "Host is already verified.",
                        };
                    
                    case "canceled":
                        console.log(`Session was canceled, creating new session for user ${sub}`);
                        return this.createNewVerification(sub);
                    
                    case "requires_input":
                        if (currentSession.last_error && this.isUnrecoverableError(currentSession.last_error)) {
                            console.log(`Session has unrecoverable error, creating new session for user ${sub}`);
                            return this.createNewVerification(sub);
                        }
                        break;
                }

                // Update stored session with current status
                await this.db.hostVerifications.update(sub, {
                    providerData: {
                        ...hostVerification.providerData,
                        verificationSession: currentSession,
                    },
                });
            }
        } catch (error: any) {
            if (this.isRedactedSessionError(error)) {
                console.log(`Verification session ${verificationSession.id} has been redacted, cleaning up and creating new session for user ${sub}`);
                // Clean up the old verification record
                await this.db.hostVerifications.update(sub, {
                    status: "pending",
                    providerData: null,
                });
                return this.createNewVerification(sub);
            }
            
            // Handle session not found (might be expired)
            if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
                console.log(`Verification session ${verificationSession.id} not found, creating new session for user ${sub}`);
                return this.createNewVerification(sub);
            }
            
            throw error;
        }

        let latestEphemeralKey = ephemeralKey;

        const ephemeralKeyExpired = this.isEphemeralKeyExpired(
            ephemeralKey.expires
        );

        if (ephemeralKeyExpired) {
            try {
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
            } catch (error: any) {
                if (this.isRedactedSessionError(error)) {
                    console.log(`Verification session ${verificationSession.id} has been redacted during key refresh, cleaning up and creating new session for user ${sub}`);
                    // Clean up the old verification record
                    await this.db.hostVerifications.update(sub, {
                        status: "pending",
                        providerData: null,
                    });
                    return this.createNewVerification(sub);
                }
                throw error;
            }
        }

        return {
            clientSecret: verificationSession.client_secret,
            ephemeralKey: latestEphemeralKey.secret,
        };
    }

    private async createNewVerification(sub: string) {
        try {
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
                }, {
                    // Add idempotency key to prevent duplicate sessions
                    idempotencyKey: `verification_${sub}_${Date.now()}`
                });

            const ephemeralKey = await this.createEphemeralKey(session.id);

            if (!session.client_secret || !ephemeralKey.secret) {
                throw new Error(ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE);
            }

            // Check if a verification record already exists
            const existingVerification = await this.db.hostVerifications.getByUserId(sub);
            
            if (existingVerification) {
                // Update existing record
                await this.db.hostVerifications.update(sub, {
                    provider: "stripe_identity",
                    providerData: { verificationSession: session, ephemeralKey },
                    status: "pending",
                    submittedAt: new Date(),
                });
            } else {
                // Create new record
                await this.db.hostVerifications.create({
                    userId: sub,
                    provider: "stripe_identity",
                    providerData: { verificationSession: session, ephemeralKey },
                    status: "pending",
                    submittedAt: new Date(),
                });
            }

            return {
                clientSecret: session.client_secret,
                ephemeralKey: ephemeralKey.secret,
            };
        } catch (error: any) {
            // Handle rate limiting and other creation errors
            if (error.type === 'StripeInvalidRequestError' && error.code === 'rate_limit') {
                console.log(`Rate limit exceeded when creating verification session for user ${sub}`);
                throw new Error(ERRORS.STRIPE.VERIFICATION.FAILED_TO_CREATE.CODE);
            }
            
            throw error;
        }
    }
}
