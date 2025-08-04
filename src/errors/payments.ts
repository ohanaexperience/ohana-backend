export default {
    PAYMENT: {
        NOT_FOUND: {
            CODE: "PAYMENT_NOT_FOUND",
            MESSAGE: "Payment record not found",
        },
        CARD_DECLINED: {
            CODE: "PAYMENT_CARD_DECLINED",
            MESSAGE: "Your card was declined",
        },
        INVALID_REQUEST: {
            CODE: "PAYMENT_INVALID_REQUEST",
            MESSAGE: "Invalid payment request",
        },
        PROCESSING_FAILED: {
            CODE: "PAYMENT_PROCESSING_FAILED",
            MESSAGE: "Payment processing failed",
        },
        NOT_AUTHORIZED: {
            CODE: "PAYMENT_NOT_AUTHORIZED",
            MESSAGE: "Payment has not been authorized",
        },
        CAPTURE_FAILED: {
            CODE: "PAYMENT_CAPTURE_FAILED",
            MESSAGE: "Failed to capture payment",
        },
        RESERVATION_MISMATCH: {
            CODE: "PAYMENT_RESERVATION_MISMATCH",
            MESSAGE: "Payment does not match reservation",
        },
        NOT_CAPTURED: {
            CODE: "PAYMENT_NOT_CAPTURED",
            MESSAGE: "Payment has not been captured",
        },
        ALREADY_REFUNDED: {
            CODE: "PAYMENT_ALREADY_REFUNDED",
            MESSAGE: "Payment has already been fully refunded",
        },
        REFUND_EXCEEDS_CHARGE: {
            CODE: "PAYMENT_REFUND_EXCEEDS_CHARGE",
            MESSAGE: "Refund amount exceeds charged amount",
        },
        REFUND_FAILED: {
            CODE: "PAYMENT_REFUND_FAILED",
            MESSAGE: "Failed to process refund",
        },
        METHOD_NOT_FOUND: {
            CODE: "PAYMENT_METHOD_NOT_FOUND",
            MESSAGE: "Payment method not found",
        },
        SETUP_FAILED: {
            CODE: "PAYMENT_SETUP_FAILED",
            MESSAGE: "Failed to set up payment. Please try again.",
        },
    },
};