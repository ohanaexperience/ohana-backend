import { ReviewService } from "@/reviews/services/review";
import { Database } from "@/database/types";
import { 
  NotFoundError, 
  InvalidInputError, 
  ForbiddenError,
  ConflictError 
} from "@/errors/classes";

// Mock the query managers
jest.mock("@/database/postgres/query_managers", () => ({
  ReviewsQueryManager: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    getById: jest.fn(),
    getByReservationId: jest.fn(),
    update: jest.fn(),
    addHostResponse: jest.fn(),
    togglePublishStatus: jest.fn(),
    delete: jest.fn(),
    getReviews: jest.fn(),
    getExperienceStats: jest.fn(),
    updateExperienceRatingStats: jest.fn(),
    addImage: jest.fn(),
    deleteImage: jest.fn(),
    voteHelpful: jest.fn(),
    removeHelpfulVote: jest.fn(),
    hasUserVotedHelpful: jest.fn()
  })),
  ReservationsQueryManager: jest.fn().mockImplementation(() => ({
    getById: jest.fn()
  })),
  ExperiencesQueryManager: jest.fn().mockImplementation(() => ({
    getById: jest.fn()
  })),
  HostsQueryManager: jest.fn().mockImplementation(() => ({
    getById: jest.fn()
  }))
}));

describe("ReviewService", () => {
  let reviewService: ReviewService;
  let mockDb: Database;
  let mockReviewsQueryManager: any;
  let mockReservationsQueryManager: any;
  let mockExperiencesQueryManager: any;
  let mockHostsQueryManager: any;

  beforeEach(() => {
    mockDb = { client: {} } as Database;
    reviewService = new ReviewService(mockDb);
    
    // Get references to the mocked instances
    mockReviewsQueryManager = (reviewService as any).reviewsQueryManager;
    mockReservationsQueryManager = (reviewService as any).reservationQueryManager;
    mockExperiencesQueryManager = (reviewService as any).experienceQueryManager;
    mockHostsQueryManager = (reviewService as any).hostQueryManager;
    
    jest.clearAllMocks();
  });

  describe("createReview", () => {
    const userId = "user-123";
    const validInput = {
      reservationId: "reservation-123",
      rating: 5,
      title: "Great experience!",
      comment: "Had an amazing time",
      images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
    };

    const mockReservation = {
      id: "reservation-123",
      userId: "user-123",
      experienceId: "experience-123",
      status: "completed",
      updatedAt: new Date()
    };

    const mockExperience = {
      id: "experience-123",
      hostId: "host-123"
    };

    it("should create a review successfully", async () => {
      const mockReview = {
        id: "review-123",
        ...validInput,
        userId,
        experienceId: mockReservation.experienceId,
        hostId: mockExperience.hostId
      };

      mockReservationsQueryManager.getById.mockResolvedValue(mockReservation);
      mockReviewsQueryManager.getByReservationId.mockResolvedValue(null);
      mockExperiencesQueryManager.getById.mockResolvedValue(mockExperience);
      mockReviewsQueryManager.create.mockResolvedValue(mockReview);
      mockReviewsQueryManager.addImage.mockResolvedValue({});
      mockReviewsQueryManager.updateExperienceRatingStats.mockResolvedValue(undefined);

      const result = await reviewService.createReview(userId, validInput);

      expect(result).toEqual(mockReview);
      expect(mockReviewsQueryManager.create).toHaveBeenCalledWith({
        reservationId: validInput.reservationId,
        experienceId: mockReservation.experienceId,
        userId,
        hostId: mockExperience.hostId,
        rating: validInput.rating,
        title: validInput.title,
        comment: validInput.comment
      });
      expect(mockReviewsQueryManager.addImage).toHaveBeenCalledTimes(2);
      expect(mockReviewsQueryManager.updateExperienceRatingStats).toHaveBeenCalledWith(
        mockReservation.experienceId
      );
    });

    it("should throw InvalidInputError for invalid rating", async () => {
      const invalidInput = { ...validInput, rating: 6 };

      await expect(
        reviewService.createReview(userId, invalidInput)
      ).rejects.toThrow(InvalidInputError);
      await expect(
        reviewService.createReview(userId, invalidInput)
      ).rejects.toThrow("Rating must be between 1 and 5");
    });

    it("should throw NotFoundError when reservation not found", async () => {
      mockReservationsQueryManager.getById.mockResolvedValue(null);

      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow(NotFoundError);
      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow("Reservation not found");
    });

    it("should throw ForbiddenError when user doesn't own reservation", async () => {
      const wrongUserReservation = { ...mockReservation, userId: "other-user" };
      mockReservationsQueryManager.getById.mockResolvedValue(wrongUserReservation);

      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow("You can only review your own reservations");
    });

    it("should throw InvalidInputError for non-completed reservation", async () => {
      const pendingReservation = { ...mockReservation, status: "pending" };
      mockReservationsQueryManager.getById.mockResolvedValue(pendingReservation);

      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow(InvalidInputError);
      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow("You can only review completed experiences");
    });

    it("should throw ConflictError when review already exists", async () => {
      mockReservationsQueryManager.getById.mockResolvedValue(mockReservation);
      mockReviewsQueryManager.getByReservationId.mockResolvedValue({ id: "existing-review" });

      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow(ConflictError);
      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow("A review already exists for this reservation");
    });

    it("should throw InvalidInputError when past review window", async () => {
      const oldReservation = {
        ...mockReservation,
        updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
      };
      mockReservationsQueryManager.getById.mockResolvedValue(oldReservation);
      mockReviewsQueryManager.getByReservationId.mockResolvedValue(null);

      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow(InvalidInputError);
      await expect(
        reviewService.createReview(userId, validInput)
      ).rejects.toThrow("Reviews must be submitted within 30 days");
    });
  });

  describe("updateReview", () => {
    const userId = "user-123";
    const reviewId = "review-123";
    const updateInput = {
      rating: 4,
      title: "Updated title",
      comment: "Updated comment"
    };

    const mockReview = {
      id: reviewId,
      userId,
      experienceId: "experience-123",
      hostResponse: null
    };

    it("should update a review successfully", async () => {
      const updatedReview = { ...mockReview, ...updateInput };
      
      mockReviewsQueryManager.getById.mockResolvedValue(mockReview);
      mockReviewsQueryManager.update.mockResolvedValue(updatedReview);
      mockReviewsQueryManager.updateExperienceRatingStats.mockResolvedValue(undefined);

      const result = await reviewService.updateReview(userId, reviewId, updateInput);

      expect(result).toEqual(updatedReview);
      expect(mockReviewsQueryManager.update).toHaveBeenCalledWith(reviewId, updateInput);
      expect(mockReviewsQueryManager.updateExperienceRatingStats).toHaveBeenCalledWith(
        mockReview.experienceId
      );
    });

    it("should throw InvalidInputError for invalid rating", async () => {
      const invalidInput = { rating: 0 };

      await expect(
        reviewService.updateReview(userId, reviewId, invalidInput)
      ).rejects.toThrow(InvalidInputError);
      await expect(
        reviewService.updateReview(userId, reviewId, invalidInput)
      ).rejects.toThrow("Rating must be between 1 and 5");
    });

    it("should throw NotFoundError when review not found", async () => {
      mockReviewsQueryManager.getById.mockResolvedValue(null);

      await expect(
        reviewService.updateReview(userId, reviewId, updateInput)
      ).rejects.toThrow(NotFoundError);
      await expect(
        reviewService.updateReview(userId, reviewId, updateInput)
      ).rejects.toThrow("Review not found");
    });

    it("should throw ForbiddenError when user doesn't own review", async () => {
      const otherUserReview = { ...mockReview, userId: "other-user" };
      mockReviewsQueryManager.getById.mockResolvedValue(otherUserReview);

      await expect(
        reviewService.updateReview(userId, reviewId, updateInput)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        reviewService.updateReview(userId, reviewId, updateInput)
      ).rejects.toThrow("You can only update your own reviews");
    });

    it("should throw InvalidInputError when host has responded", async () => {
      const respondedReview = { ...mockReview, hostResponse: "Thank you!" };
      mockReviewsQueryManager.getById.mockResolvedValue(respondedReview);

      await expect(
        reviewService.updateReview(userId, reviewId, updateInput)
      ).rejects.toThrow(InvalidInputError);
      await expect(
        reviewService.updateReview(userId, reviewId, updateInput)
      ).rejects.toThrow("Cannot update review after host has responded");
    });
  });

  describe("deleteReview", () => {
    const userId = "user-123";
    const reviewId = "review-123";

    const mockReview = {
      id: reviewId,
      userId,
      experienceId: "experience-123",
      hostResponse: null
    };

    it("should delete a review successfully", async () => {
      mockReviewsQueryManager.getById.mockResolvedValue(mockReview);
      mockReviewsQueryManager.delete.mockResolvedValue(undefined);
      mockReviewsQueryManager.updateExperienceRatingStats.mockResolvedValue(undefined);

      await reviewService.deleteReview(userId, reviewId);

      expect(mockReviewsQueryManager.delete).toHaveBeenCalledWith(reviewId);
      expect(mockReviewsQueryManager.updateExperienceRatingStats).toHaveBeenCalledWith(
        mockReview.experienceId
      );
    });

    it("should throw NotFoundError when review not found", async () => {
      mockReviewsQueryManager.getById.mockResolvedValue(null);

      await expect(
        reviewService.deleteReview(userId, reviewId)
      ).rejects.toThrow(NotFoundError);
      await expect(
        reviewService.deleteReview(userId, reviewId)
      ).rejects.toThrow("Review not found");
    });

    it("should throw ForbiddenError when user doesn't own review", async () => {
      const otherUserReview = { ...mockReview, userId: "other-user" };
      mockReviewsQueryManager.getById.mockResolvedValue(otherUserReview);

      await expect(
        reviewService.deleteReview(userId, reviewId)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        reviewService.deleteReview(userId, reviewId)
      ).rejects.toThrow("You can only delete your own reviews");
    });

    it("should throw InvalidInputError when host has responded", async () => {
      const respondedReview = { ...mockReview, hostResponse: "Thank you!" };
      mockReviewsQueryManager.getById.mockResolvedValue(respondedReview);

      await expect(
        reviewService.deleteReview(userId, reviewId)
      ).rejects.toThrow(InvalidInputError);
      await expect(
        reviewService.deleteReview(userId, reviewId)
      ).rejects.toThrow("Cannot delete review after host has responded");
    });
  });

  describe("addHostResponse", () => {
    const hostId = "host-123";
    const reviewId = "review-123";
    const response = "Thank you for your feedback!";

    const mockReview = {
      id: reviewId,
      hostId,
      hostResponse: null
    };

    const mockHost = {
      id: hostId
    };

    it("should add host response successfully", async () => {
      const respondedReview = { ...mockReview, hostResponse: response };
      
      mockReviewsQueryManager.getById.mockResolvedValue(mockReview);
      mockHostsQueryManager.getById.mockResolvedValue(mockHost);
      mockReviewsQueryManager.addHostResponse.mockResolvedValue(respondedReview);

      const result = await reviewService.addHostResponse(hostId, reviewId, response);

      expect(result).toEqual(respondedReview);
      expect(mockReviewsQueryManager.addHostResponse).toHaveBeenCalledWith(reviewId, response);
    });

    it("should throw NotFoundError when review not found", async () => {
      mockReviewsQueryManager.getById.mockResolvedValue(null);

      await expect(
        reviewService.addHostResponse(hostId, reviewId, response)
      ).rejects.toThrow(NotFoundError);
      await expect(
        reviewService.addHostResponse(hostId, reviewId, response)
      ).rejects.toThrow("Review not found");
    });

    it("should throw ForbiddenError when host doesn't own experience", async () => {
      const otherHostReview = { ...mockReview, hostId: "other-host" };
      mockReviewsQueryManager.getById.mockResolvedValue(otherHostReview);
      mockHostsQueryManager.getById.mockResolvedValue(mockHost);

      await expect(
        reviewService.addHostResponse(hostId, reviewId, response)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        reviewService.addHostResponse(hostId, reviewId, response)
      ).rejects.toThrow("You can only respond to reviews for your own experiences");
    });

    it("should throw ConflictError when already responded", async () => {
      const respondedReview = { ...mockReview, hostResponse: "Already responded" };
      mockReviewsQueryManager.getById.mockResolvedValue(respondedReview);
      mockHostsQueryManager.getById.mockResolvedValue(mockHost);

      await expect(
        reviewService.addHostResponse(hostId, reviewId, response)
      ).rejects.toThrow(ConflictError);
      await expect(
        reviewService.addHostResponse(hostId, reviewId, response)
      ).rejects.toThrow("You have already responded to this review");
    });
  });

  describe("voteHelpful", () => {
    const userId = "user-123";
    const reviewId = "review-123";

    const mockReview = {
      id: reviewId,
      userId: "other-user"
    };

    it("should vote review as helpful successfully", async () => {
      const mockVote = { id: "vote-123", reviewId, userId };
      
      mockReviewsQueryManager.getById.mockResolvedValue(mockReview);
      mockReviewsQueryManager.voteHelpful.mockResolvedValue(mockVote);

      const result = await reviewService.voteHelpful(userId, reviewId);

      expect(result).toEqual(mockVote);
      expect(mockReviewsQueryManager.voteHelpful).toHaveBeenCalledWith(reviewId, userId);
    });

    it("should throw NotFoundError when review not found", async () => {
      mockReviewsQueryManager.getById.mockResolvedValue(null);

      await expect(
        reviewService.voteHelpful(userId, reviewId)
      ).rejects.toThrow(NotFoundError);
      await expect(
        reviewService.voteHelpful(userId, reviewId)
      ).rejects.toThrow("Review not found");
    });

    it("should throw InvalidInputError when voting own review", async () => {
      const ownReview = { ...mockReview, userId };
      mockReviewsQueryManager.getById.mockResolvedValue(ownReview);

      await expect(
        reviewService.voteHelpful(userId, reviewId)
      ).rejects.toThrow(InvalidInputError);
      await expect(
        reviewService.voteHelpful(userId, reviewId)
      ).rejects.toThrow("You cannot vote on your own reviews");
    });

    it("should throw ConflictError when already voted", async () => {
      mockReviewsQueryManager.getById.mockResolvedValue(mockReview);
      mockReviewsQueryManager.voteHelpful.mockResolvedValue(null);

      await expect(
        reviewService.voteHelpful(userId, reviewId)
      ).rejects.toThrow(ConflictError);
      await expect(
        reviewService.voteHelpful(userId, reviewId)
      ).rejects.toThrow("You have already voted this review as helpful");
    });
  });

  describe("getExperienceReviews", () => {
    const experienceId = "experience-123";
    const options = {
      limit: 20,
      offset: 0,
      orderBy: "newest" as const,
      minRating: 3,
      userId: "user-123"
    };

    it("should get experience reviews successfully", async () => {
      const mockReviews = [
        { id: "review-1", experienceId, rating: 5 },
        { id: "review-2", experienceId, rating: 4 }
      ];

      mockReviewsQueryManager.getReviews.mockResolvedValue(mockReviews);

      const result = await reviewService.getExperienceReviews(experienceId, options);

      expect(result).toEqual(mockReviews);
      expect(mockReviewsQueryManager.getReviews).toHaveBeenCalledWith({
        experienceId,
        isPublished: true,
        ...options
      });
    });
  });

  describe("getExperienceStats", () => {
    const experienceId = "experience-123";

    it("should get experience statistics successfully", async () => {
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

      mockReviewsQueryManager.getExperienceStats.mockResolvedValue(mockStats);

      const result = await reviewService.getExperienceStats(experienceId);

      expect(result).toEqual(mockStats);
      expect(mockReviewsQueryManager.getExperienceStats).toHaveBeenCalledWith(experienceId);
    });
  });

  describe("togglePublishStatus", () => {
    const reviewId = "review-123";
    const isPublished = false;

    const mockReview = {
      id: reviewId,
      experienceId: "experience-123"
    };

    it("should toggle publish status successfully", async () => {
      const updatedReview = { ...mockReview, isPublished };
      
      mockReviewsQueryManager.getById.mockResolvedValue(mockReview);
      mockReviewsQueryManager.togglePublishStatus.mockResolvedValue(updatedReview);
      mockReviewsQueryManager.updateExperienceRatingStats.mockResolvedValue(undefined);

      const result = await reviewService.togglePublishStatus(reviewId, isPublished);

      expect(result).toEqual(updatedReview);
      expect(mockReviewsQueryManager.togglePublishStatus).toHaveBeenCalledWith(reviewId, isPublished);
      expect(mockReviewsQueryManager.updateExperienceRatingStats).toHaveBeenCalledWith(
        mockReview.experienceId
      );
    });

    it("should throw NotFoundError when review not found", async () => {
      mockReviewsQueryManager.getById.mockResolvedValue(null);

      await expect(
        reviewService.togglePublishStatus(reviewId, isPublished)
      ).rejects.toThrow(NotFoundError);
      await expect(
        reviewService.togglePublishStatus(reviewId, isPublished)
      ).rejects.toThrow("Review not found");
    });
  });
});