import Stripe from "stripe";

export type StripeIdentityData = {
    verificationSession: Stripe.Identity.VerificationSession;
    ephemeralKey: Stripe.EphemeralKey;
};
export type ProviderData = StripeIdentityData;
