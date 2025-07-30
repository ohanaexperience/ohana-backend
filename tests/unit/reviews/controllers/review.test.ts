import { ReviewController } from "@/reviews/controllers/review";
import { ReviewService } from "@/reviews/services/review";
import { AuthContext } from "@/types";

// Mock dependencies
jest.mock("@/reviews/services/review");
jest.mock("@/database", () => ({
  DatabaseFactory: {
    create: jest.fn().mockReturnValue({ client: {} })
  }
}));
jest.mock("@/database/proxy-config", () => ({
  createDatabaseConfig: jest.fn().mockReturnValue({})
}));

describe("ReviewController", () => {
  let reviewController: ReviewController;
  let mockReviewService: jest.Mocked<ReviewService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create controller instance
    reviewController = new ReviewController();
    
    // Get the mocked service instance
    mockReviewService = (ReviewService as jest.MockedClass<typeof ReviewService>).mock.instances[0] as jest.Mocked<ReviewService>;
  });

  describe("createReview", () => {
    const authContext: AuthContext = {
      userId: "user-123",
      email: "user@example.com",
      isHost: false,
      isAdmin: false
    };

    const body = {
      reservationId: "reservation-123",
      rating: 5,
      title: "Great experience!",
      comment: "Had an amazing time"
    };

    it("should create review successfully", async () => {
      const mockReview = {
        id: "review-123",
        ...body,
        userId: authContext.userId
      };

      mockReviewService.createReview.mockResolvedValue(mockReview);

      const result = await reviewController.createReview(body, authContext);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        message: "Review created successfully",
        data: mockReview
      });
      expect(mockReviewService.createReview).toHaveBeenCalledWith(
        authContext.userId,
        body
      );
    });

    it("should handle errors properly", async () => {
      const error = new Error("Database error");
      mockReviewService.createReview.mockRejectedValue(error);

      const result = await reviewController.createReview(body, authContext);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Internal server error",
        message: "An unexpected error occurred"
      });
    });
  });

  describe("updateReview", () => {
    const authContext: AuthContext = {
      userId: "user-123",
      email: "user@example.com",
      isHost: false,
      isAdmin: false
    };

    const reviewId = "review-123";
    const body = {
      rating: 4,
      title: "Updated title"
    };

    it("should update review successfully", async () => {
      const mockUpdatedReview = {
        id: reviewId,
        ...body,
        userId: authContext.userId
      };

      mockReviewService.updateReview.mockResolvedValue(mockUpdatedReview);

      const result = await reviewController.updateReview(reviewId, body, authContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: "Review updated successfully",
        data: mockUpdatedReview
      });
      expect(mockReviewService.updateReview).toHaveBeenCalledWith(
        authContext.userId,
        reviewId,
        body
      );
    });
  });

  describe("deleteReview", () => {
    const authContext: AuthContext = {
      userId: "user-123",
      email: "user@example.com",
      isHost: false,
      isAdmin: false
    };

    const reviewId = "review-123";

    it("should delete review successfully", async () => {
      mockReviewService.deleteReview.mockResolvedValue(undefined);

      const result = await reviewController.deleteReview(reviewId, authContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: "Review deleted successfully"
      });
      expect(mockReviewService.deleteReview).toHaveBeenCalledWith(
        authContext.userId,
        reviewId
      );
    });
  });

  describe("voteHelpful", () => {
    const authContext: AuthContext = {
      userId: "user-123",
      email: "user@example.com",
      isHost: false,
      isAdmin: false
    };

    const reviewId = "review-123";

    it("should vote review as helpful successfully", async () => {
      const mockVote = {
        id: "vote-123",
        reviewId,
        userId: authContext.userId
      };

      mockReviewService.voteHelpful.mockResolvedValue(mockVote);

      const result = await reviewController.voteHelpful(reviewId, authContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: "Vote recorded successfully",
        data: mockVote
      });
      expect(mockReviewService.voteHelpful).toHaveBeenCalledWith(
        authContext.userId,
        reviewId
      );
    });
  });

  describe("removeHelpfulVote", () => {
    const authContext: AuthContext = {
      userId: "user-123",
      email: "user@example.com",
      isHost: false,
      isAdmin: false
    };

    const reviewId = "review-123";

    it("should remove helpful vote successfully", async () => {
      mockReviewService.removeHelpfulVote.mockResolvedValue(undefined);

      const result = await reviewController.removeHelpfulVote(reviewId, authContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: "Vote removed successfully"
      });
      expect(mockReviewService.removeHelpfulVote).toHaveBeenCalledWith(
        authContext.userId,
        reviewId
      );
    });
  });

  describe("getMyReviews", () => {
    const authContext: AuthContext = {
      userId: "user-123",
      email: "user@example.com",
      isHost: false,
      isAdmin: false
    };

    const queryParams = {
      limit: 10,
      offset: 0
    };

    it("should get user reviews successfully", async () => {
      const mockReviews = [
        { id: "review-1", rating: 5 },
        { id: "review-2", rating: 4 }
      ];

      mockReviewService.getUserReviews.mockResolvedValue(mockReviews);

      const result = await reviewController.getMyReviews(queryParams, authContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        data: mockReviews
      });
      expect(mockReviewService.getUserReviews).toHaveBeenCalledWith(
        authContext.userId,
        {
          limit: 10,
          offset: 0
        }
      );
    });

    it("should use default values when no query params", async () => {
      mockReviewService.getUserReviews.mockResolvedValue([]);

      const result = await reviewController.getMyReviews(null, authContext);

      expect(result.statusCode).toBe(200);
      expect(mockReviewService.getUserReviews).toHaveBeenCalledWith(
        authContext.userId,
        {
          limit: 20,
          offset: 0
        }
      );
    });
  });

  describe("respondToReview", () => {
    const authContext: AuthContext = {
      userId: "user-123",
      email: "host@example.com",
      isHost: true,
      hostId: "host-123",
      isAdmin: false
    };

    const reviewId = "review-123";
    const body = {
      response: "Thank you for your feedback!"
    };

    it("should add host response successfully", async () => {
      const hostResponseDate = new Date();
      const mockReviewWithResponse = {
        id: reviewId,
        hostResponse: body.response,
        hostResponseAt: hostResponseDate
      };

      mockReviewService.addHostResponse.mockResolvedValue(mockReviewWithResponse);

      const result = await reviewController.respondToReview(reviewId, body, authContext);

      expect(result.statusCode).toBe(200);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.message).toBe("Response added successfully");
      expect(parsedBody.data.id).toBe(reviewId);
      expect(parsedBody.data.hostResponse).toBe(body.response);
      expect(parsedBody.data.hostResponseAt).toBe(hostResponseDate.toISOString());
      expect(mockReviewService.addHostResponse).toHaveBeenCalledWith(
        authContext.hostId,
        reviewId,
        body.response
      );
    });
  });

  describe("getHostReviews", () => {
    const authContext: AuthContext = {
      userId: "user-123",
      email: "host@example.com",
      isHost: true,
      hostId: "host-123",
      isAdmin: false
    };

    const queryParams = {
      limit: 10,
      offset: 0,
      hasHostResponse: false
    };

    it("should get host reviews successfully", async () => {
      const mockReviews = [
        { id: "review-1", rating: 5, hostResponse: null },
        { id: "review-2", rating: 4, hostResponse: null }
      ];

      mockReviewService.getHostReviews.mockResolvedValue(mockReviews);

      const result = await reviewController.getHostReviews(queryParams, authContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        data: mockReviews
      });
      expect(mockReviewService.getHostReviews).toHaveBeenCalledWith(
        authContext.hostId,
        queryParams
      );
    });
  });

  describe("getExperienceReviews", () => {
    const experienceId = "experience-123";
    const queryParams = {
      limit: 10,
      offset: 0,
      orderBy: "newest",
      minRating: 3
    };

    it("should get experience reviews for unauthenticated user", async () => {
      const mockReviews = [
        { id: "review-1", rating: 5 },
        { id: "review-2", rating: 4 }
      ];

      mockReviewService.getExperienceReviews.mockResolvedValue(mockReviews);

      const result = await reviewController.getExperienceReviews(
        experienceId,
        queryParams,
        undefined
      );

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        data: mockReviews
      });
      expect(mockReviewService.getExperienceReviews).toHaveBeenCalledWith(
        experienceId,
        {
          limit: 10,
          offset: 0,
          orderBy: "newest",
          minRating: 3,
          userId: undefined
        }
      );
    });

    it("should include helpful vote status for authenticated user", async () => {
      const userId = "user-123";
      const mockReviews = [
        { id: "review-1", rating: 5 },
        { id: "review-2", rating: 4 }
      ];

      mockReviewService.getExperienceReviews.mockResolvedValue(mockReviews);
      mockReviewService.hasUserVotedHelpful
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await reviewController.getExperienceReviews(
        experienceId,
        queryParams,
        userId
      );

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        data: [
          { ...mockReviews[0], hasVotedHelpful: true },
          { ...mockReviews[1], hasVotedHelpful: false }
        ]
      });
      expect(mockReviewService.hasUserVotedHelpful).toHaveBeenCalledTimes(2);
    });
  });

  describe("getReviewStats", () => {
    const experienceId = "experience-123";

    it("should get review statistics successfully", async () => {
      const mockStats = {
        experienceId,
        averageRating: 4.5,
        totalReviews: 100,
        ratingDistribution: {
          1: 5,
          2: 10,
          3: 15,
          4: 30,
          5: 40
        }
      };

      mockReviewService.getExperienceStats.mockResolvedValue(mockStats);

      const result = await reviewController.getReviewStats(experienceId);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        data: mockStats
      });
      expect(mockReviewService.getExperienceStats).toHaveBeenCalledWith(experienceId);
    });
  });

  describe("moderateReview", () => {
    const reviewId = "review-123";
    const body = {
      isPublished: false
    };

    it("should moderate review successfully", async () => {
      const mockModeratedReview = {
        id: reviewId,
        isPublished: false
      };

      mockReviewService.togglePublishStatus.mockResolvedValue(mockModeratedReview);

      const result = await reviewController.moderateReview(reviewId, body);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: "Review unpublished successfully",
        data: mockModeratedReview
      });
      expect(mockReviewService.togglePublishStatus).toHaveBeenCalledWith(
        reviewId,
        false
      );
    });

    it("should show correct message when publishing", async () => {
      const publishBody = { isPublished: true };
      const mockPublishedReview = {
        id: reviewId,
        isPublished: true
      };

      mockReviewService.togglePublishStatus.mockResolvedValue(mockPublishedReview);

      const result = await reviewController.moderateReview(reviewId, publishBody);

      expect(JSON.parse(result.body).message).toBe("Review published successfully");
    });
  });

  describe("getAllReviews", () => {
    const queryParams = {
      limit: 50,
      offset: 0,
      isPublished: true,
      minRating: 3,
      maxRating: 5
    };

    it("should get all reviews successfully", async () => {
      const mockReviews = [
        { id: "review-1", rating: 5, isPublished: true },
        { id: "review-2", rating: 4, isPublished: true }
      ];

      mockReviewService.getAllReviews.mockResolvedValue(mockReviews);

      const result = await reviewController.getAllReviews(queryParams);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        data: mockReviews
      });
      expect(mockReviewService.getAllReviews).toHaveBeenCalledWith(queryParams);
    });

    it("should use default values when no query params", async () => {
      mockReviewService.getAllReviews.mockResolvedValue([]);

      const result = await reviewController.getAllReviews(null);

      expect(result.statusCode).toBe(200);
      expect(mockReviewService.getAllReviews).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        isPublished: undefined,
        hasHostResponse: undefined,
        minRating: undefined,
        maxRating: undefined
      });
    });
  });
});