import { createReviewValidation } from "@/reviews/validations/user/createReview";
import { updateReviewValidation } from "@/reviews/validations/user/updateReview";
import { deleteReviewValidation } from "@/reviews/validations/user/deleteReview";
import { voteHelpfulValidation } from "@/reviews/validations/user/voteHelpful";
import { getMyReviewsValidation } from "@/reviews/validations/user/getMyReviews";
import { respondToReviewValidation } from "@/reviews/validations/host/respondToReview";
import { getHostReviewsValidation } from "@/reviews/validations/host/getHostReviews";
import { getExperienceReviewsValidation } from "@/reviews/validations/public/getExperienceReviews";
import { getReviewStatsValidation } from "@/reviews/validations/public/getReviewStats";
import { moderateReviewValidation } from "@/reviews/validations/admin/moderateReview";
import { getAllReviewsValidation } from "@/reviews/validations/admin/getAllReviews";

describe("Review Validations", () => {
  describe("createReviewValidation", () => {
    it("should validate valid create review input", () => {
      const validInput = {
        body: {
          reservationId: "550e8400-e29b-41d4-a716-446655440000",
          rating: 5,
          title: "Great experience!",
          comment: "Had an amazing time",
          images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
        }
      };

      const result = createReviewValidation.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should fail with invalid UUID", () => {
      const invalidInput = {
        body: {
          reservationId: "invalid-uuid",
          rating: 5
        }
      };

      const result = createReviewValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid reservation ID");
      }
    });

    it("should fail with rating out of range", () => {
      const invalidInput = {
        body: {
          reservationId: "550e8400-e29b-41d4-a716-446655440000",
          rating: 6
        }
      };

      const result = createReviewValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("less than or equal to 5");
      }
    });

    it("should fail with too many images", () => {
      const invalidInput = {
        body: {
          reservationId: "550e8400-e29b-41d4-a716-446655440000",
          rating: 5,
          images: [
            "https://example.com/1.jpg",
            "https://example.com/2.jpg",
            "https://example.com/3.jpg",
            "https://example.com/4.jpg",
            "https://example.com/5.jpg",
            "https://example.com/6.jpg"
          ]
        }
      };

      const result = createReviewValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("images");
      }
    });

    it("should allow optional fields to be omitted", () => {
      const minimalInput = {
        body: {
          reservationId: "550e8400-e29b-41d4-a716-446655440000",
          rating: 4
        }
      };

      const result = createReviewValidation.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });
  });

  describe("updateReviewValidation", () => {
    it("should validate valid update review input", () => {
      const validInput = {
        pathParameters: {
          reviewId: "550e8400-e29b-41d4-a716-446655440000"
        },
        body: {
          rating: 4,
          title: "Updated title"
        }
      };

      const result = updateReviewValidation.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should fail with empty body", () => {
      const invalidInput = {
        pathParameters: {
          reviewId: "550e8400-e29b-41d4-a716-446655440000"
        },
        body: {}
      };

      const result = updateReviewValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("At least one field must be provided to update");
      }
    });

    it("should fail with invalid review ID", () => {
      const invalidInput = {
        pathParameters: {
          reviewId: "invalid-uuid"
        },
        body: {
          rating: 4
        }
      };

      const result = updateReviewValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid review ID");
      }
    });
  });

  describe("getMyReviewsValidation", () => {
    it("should validate valid query parameters", () => {
      const validInput = {
        queryStringParameters: {
          limit: "20",
          offset: "10"
        }
      };

      const result = getMyReviewsValidation.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryStringParameters?.limit).toBe(20);
        expect(result.data.queryStringParameters?.offset).toBe(10);
      }
    });

    it("should allow missing query parameters", () => {
      const validInput = {};

      const result = getMyReviewsValidation.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should fail with invalid limit", () => {
      const invalidInput = {
        queryStringParameters: {
          limit: "abc"
        }
      };

      const result = getMyReviewsValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should fail with limit too high", () => {
      const invalidInput = {
        queryStringParameters: {
          limit: "150"
        }
      };

      const result = getMyReviewsValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("respondToReviewValidation", () => {
    it("should validate valid host response", () => {
      const validInput = {
        pathParameters: {
          reviewId: "550e8400-e29b-41d4-a716-446655440000"
        },
        body: {
          response: "Thank you for your feedback!"
        }
      };

      const result = respondToReviewValidation.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should fail with empty response", () => {
      const invalidInput = {
        pathParameters: {
          reviewId: "550e8400-e29b-41d4-a716-446655440000"
        },
        body: {
          response: ""
        }
      };

      const result = respondToReviewValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should fail with response too long", () => {
      const invalidInput = {
        pathParameters: {
          reviewId: "550e8400-e29b-41d4-a716-446655440000"
        },
        body: {
          response: "a".repeat(1001)
        }
      };

      const result = respondToReviewValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("getExperienceReviewsValidation", () => {
    it("should validate valid query parameters", () => {
      const validInput = {
        pathParameters: {
          experienceId: "550e8400-e29b-41d4-a716-446655440000"
        },
        queryStringParameters: {
          limit: "20",
          offset: "0",
          orderBy: "newest",
          minRating: "3"
        }
      };

      const result = getExperienceReviewsValidation.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryStringParameters?.orderBy).toBe("newest");
        expect(result.data.queryStringParameters?.minRating).toBe(3);
      }
    });

    it("should fail with invalid orderBy", () => {
      const invalidInput = {
        pathParameters: {
          experienceId: "550e8400-e29b-41d4-a716-446655440000"
        },
        queryStringParameters: {
          orderBy: "invalid"
        }
      };

      const result = getExperienceReviewsValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should fail with invalid minRating", () => {
      const invalidInput = {
        pathParameters: {
          experienceId: "550e8400-e29b-41d4-a716-446655440000"
        },
        queryStringParameters: {
          minRating: "6"
        }
      };

      const result = getExperienceReviewsValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("getHostReviewsValidation", () => {
    it("should validate and transform hasHostResponse", () => {
      const validInput = {
        queryStringParameters: {
          hasHostResponse: "true",
          limit: "10"
        }
      };

      const result = getHostReviewsValidation.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryStringParameters?.hasHostResponse).toBe(true);
      }
    });

    it("should transform false string to boolean", () => {
      const validInput = {
        queryStringParameters: {
          hasHostResponse: "false"
        }
      };

      const result = getHostReviewsValidation.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryStringParameters?.hasHostResponse).toBe(false);
      }
    });
  });

  describe("moderateReviewValidation", () => {
    it("should validate moderation input", () => {
      const validInput = {
        pathParameters: {
          reviewId: "550e8400-e29b-41d4-a716-446655440000"
        },
        body: {
          isPublished: false
        }
      };

      const result = moderateReviewValidation.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should fail without isPublished", () => {
      const invalidInput = {
        pathParameters: {
          reviewId: "550e8400-e29b-41d4-a716-446655440000"
        },
        body: {}
      };

      const result = moderateReviewValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("getAllReviewsValidation", () => {
    it("should validate all query parameters", () => {
      const validInput = {
        queryStringParameters: {
          limit: "50",
          offset: "0",
          isPublished: "true",
          hasHostResponse: "false",
          minRating: "3",
          maxRating: "5"
        }
      };

      const result = getAllReviewsValidation.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryStringParameters?.isPublished).toBe(true);
        expect(result.data.queryStringParameters?.hasHostResponse).toBe(false);
        expect(result.data.queryStringParameters?.minRating).toBe(3);
        expect(result.data.queryStringParameters?.maxRating).toBe(5);
      }
    });

    it("should fail with invalid rating range", () => {
      const invalidInput = {
        queryStringParameters: {
          minRating: "0",
          maxRating: "6"
        }
      };

      const result = getAllReviewsValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});