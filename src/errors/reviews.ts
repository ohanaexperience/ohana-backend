export default {
    REVIEWS: {
        REVIEW: {
            NOT_FOUND: {
                CODE: "REVIEW_NOT_FOUND",
                MESSAGE: "Review not found.",
            },
            ALREADY_EXISTS: {
                CODE: "REVIEW_ALREADY_EXISTS",
                MESSAGE: "A review already exists for this reservation.",
            },
            OUTSIDE_WINDOW: {
                CODE: "REVIEW_OUTSIDE_WINDOW",
                MESSAGE: "Reviews must be submitted within 30 days of experience completion.",
            },
            ONLY_COMPLETED_EXPERIENCES: {
                CODE: "REVIEW_ONLY_COMPLETED_EXPERIENCES",
                MESSAGE: "You can only review completed experiences.",
            },
            CANNOT_UPDATE_AFTER_HOST_RESPONSE: {
                CODE: "REVIEW_CANNOT_UPDATE_AFTER_HOST_RESPONSE",
                MESSAGE: "Cannot update review after host has responded.",
            },
            CANNOT_DELETE_AFTER_HOST_RESPONSE: {
                CODE: "REVIEW_CANNOT_DELETE_AFTER_HOST_RESPONSE",
                MESSAGE: "Cannot delete review after host has responded.",
            },
            CANNOT_VOTE_OWN_REVIEW: {
                CODE: "REVIEW_CANNOT_VOTE_OWN",
                MESSAGE: "You cannot vote on your own reviews.",
            },
            ALREADY_VOTED_HELPFUL: {
                CODE: "REVIEW_ALREADY_VOTED_HELPFUL",
                MESSAGE: "You have already voted this review as helpful.",
            },
        },
        RESERVATION: {
            NOT_FOUND: {
                CODE: "RESERVATION_NOT_FOUND",
                MESSAGE: "Reservation not found.",
            },
            NOT_OWNED_BY_USER: {
                CODE: "RESERVATION_NOT_OWNED_BY_USER",
                MESSAGE: "You can only review your own reservations.",
            },
        },
        EXPERIENCE: {
            NOT_FOUND: {
                CODE: "EXPERIENCE_NOT_FOUND",
                MESSAGE: "Experience not found.",
            },
        },
        HOST_RESPONSE: {
            ALREADY_RESPONDED: {
                CODE: "HOST_ALREADY_RESPONDED",
                MESSAGE: "You have already responded to this review.",
            },
            NOT_HOST_EXPERIENCE: {
                CODE: "NOT_HOST_EXPERIENCE",
                MESSAGE: "You can only respond to reviews for your own experiences.",
            },
        },
        PERMISSIONS: {
            UPDATE_OWN_REVIEWS_ONLY: {
                CODE: "UPDATE_OWN_REVIEWS_ONLY",
                MESSAGE: "You can only update your own reviews.",
            },
            DELETE_OWN_REVIEWS_ONLY: {
                CODE: "DELETE_OWN_REVIEWS_ONLY",
                MESSAGE: "You can only delete your own reviews.",
            },
        },
        VOTE: {
            NOT_FOUND: {
                CODE: "REVIEW_VOTE_NOT_FOUND",
                MESSAGE: "Vote not found.",
            },
        },
    },
};