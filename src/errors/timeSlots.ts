export default {
    TIME_SLOT: {
        NOT_FOUND: {
            CODE: "TIME_SLOT_NOT_FOUND",
            MESSAGE: "Time slot not found.",
        },
        NOT_AVAILABLE: {
            CODE: "TIME_SLOT_NOT_AVAILABLE",
            MESSAGE: "Time slot is not available.",
        },
        NOT_ENOUGH_CAPACITY: {
            CODE: "TIME_SLOT_NOT_ENOUGH_CAPACITY",
            MESSAGE: "Time slot does not have enough capacity.",
        },
        ID: {
            MISSING: {
                CODE: "TIME_SLOT_ID_MISSING",
                MESSAGE: "Time slot ID is required.",
            },
            INVALID_TYPE: {
                CODE: "TIME_SLOT_ID_INVALID_TYPE",
                MESSAGE: "Time slot ID must be a string.",
            },
        },
        INVALID_DATE_RANGE: {
            CODE: "INVALID_TIME_SLOT_DATE_RANGE",
            MESSAGE: "Invalid date range: start date cannot be after end date.",
        },
    },
};
