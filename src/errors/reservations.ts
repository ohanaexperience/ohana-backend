import {
    RESERVATION_NUMBER_OF_GUESTS_MIN,
    RESERVATION_NUMBER_OF_GUESTS_MAX,
} from "@/constants/reservations";

export default {
    RESERVATIONS: {
        NOT_FOUND: {
            CODE: "RESERVATION_NOT_FOUND",
            MESSAGE: "Reservation not found.",
        },
        CANNOT_CANCEL: {
            CODE: "RESERVATION_CANNOT_CANCEL",
            MESSAGE: "This reservation cannot be cancelled.",
        },
        INVALID_HOLD_STATUS: {
            CODE: "INVALID_HOLD_STATUS",
            MESSAGE: "This reservation is not in a held status and cannot be converted.",
        },
        HOLD_EXPIRED: {
            CODE: "HOLD_EXPIRED",
            MESSAGE: "The reservation hold has expired.",
        },
        NUMBER_OF_GUESTS: {
            MISSING: {
                CODE: "RESERVATION_NUMBER_OF_GUESTS_MISSING",
                MESSAGE: "Number of guests is required.",
            },
            INVALID_TYPE: {
                CODE: "RESERVATION_NUMBER_OF_GUESTS_INVALID_TYPE",
                MESSAGE: "Number of guests must be a number.",
            },
            MIN_VALUE: {
                CODE: "RESERVATION_NUMBER_OF_GUESTS_MIN_VALUE",
                MESSAGE: `Number of guests must be greater than ${RESERVATION_NUMBER_OF_GUESTS_MIN}.`,
            },
            MAX_VALUE: {
                CODE: "RESERVATION_NUMBER_OF_GUESTS_MAX_VALUE",
                MESSAGE: `Number of guests must be less than ${RESERVATION_NUMBER_OF_GUESTS_MAX}.`,
            },
        },
    },
};
