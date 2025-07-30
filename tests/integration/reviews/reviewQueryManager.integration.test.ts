import { ReviewsQueryManager } from "@/database/postgres/query_managers";
import { v4 as uuidv4 } from "uuid";
import { createDatabaseConfig } from "@/database/proxy-config";
import Postgres from "@/database/postgres";

describe("ReviewsQueryManager Integration Tests", () => {
  let database: Postgres;
  let reviewsQueryManager: ReviewsQueryManager;
  let testUserId: string;
  let testHostId: string;
  let testExperienceId: string;
  let testReservationId: string;

  beforeAll(async () => {
    const dbConfig = createDatabaseConfig();
    database = new Postgres(dbConfig);
    await database.connect();
    
    // Get query manager from database instance
    reviewsQueryManager = database.reviews;
    
    // Create test data
    testUserId = uuidv4();
    testHostId = uuidv4();
    testExperienceId = uuidv4();
    testReservationId = uuidv4();

    // Create test user, host, experience, and reservation
    // This would normally be done through the respective query managers
    // For now, we'll assume these exist in the test database
  });

  afterAll(async () => {
    // Cleanup if needed
    await database.close();
  });

  describe("create", () => {
    it("should create a new review", async () => {
      const reviewData = {
        reservationId: testReservationId,
        experienceId: testExperienceId,
        userId: testUserId,
        hostId: testHostId,
        rating: 5,
        title: "Amazing experience!",
        comment: "Had a wonderful time, highly recommend!"
      };

      const review = await reviewsQueryManager.create(reviewData);

      expect(review).toBeDefined();
      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.title).toBe("Amazing experience!");
      expect(review.comment).toBe("Had a wonderful time, highly recommend!");
      expect(review.isPublished).toBe(true);
    });
  });

  describe("getById", () => {
    let testReviewId: string;

    beforeEach(async () => {
      const review = await reviewsQueryManager.create({
        reservationId: uuidv4(),
        experienceId: testExperienceId,
        userId: testUserId,
        hostId: testHostId,
        rating: 4,
        title: "Good experience",
        comment: "It was nice"
      });
      testReviewId = review.id;
    });

    it("should retrieve a review by id with relations", async () => {
      const review = await reviewsQueryManager.getById(testReviewId);

      expect(review).toBeDefined();
      expect(review?.id).toBe(testReviewId);
      expect(review?.rating).toBe(4);
      expect(review?.images).toBeDefined();
      expect(review?.helpfulVotes).toBeDefined();
    });

    it("should return null for non-existent review", async () => {
      const review = await reviewsQueryManager.getById(uuidv4());
      expect(review).toBeNull();
    });
  });

  describe("update", () => {
    let testReviewId: string;

    beforeEach(async () => {
      const review = await reviewsQueryManager.create({
        reservationId: uuidv4(),
        experienceId: testExperienceId,
        userId: testUserId,
        hostId: testHostId,
        rating: 3,
        title: "Okay experience",
        comment: "It was alright"
      });
      testReviewId = review.id;
    });

    it("should update a review", async () => {
      const updateData = {
        rating: 5,
        title: "Actually amazing!",
        comment: "Changed my mind, it was great!"
      };

      const updated = await reviewsQueryManager.update(testReviewId, updateData);

      expect(updated.rating).toBe(5);
      expect(updated.title).toBe("Actually amazing!");
      expect(updated.comment).toBe("Changed my mind, it was great!");
    });
  });

  describe("addHostResponse", () => {
    let testReviewId: string;

    beforeEach(async () => {
      const review = await reviewsQueryManager.create({
        reservationId: uuidv4(),
        experienceId: testExperienceId,
        userId: testUserId,
        hostId: testHostId,
        rating: 5,
        title: "Great!",
        comment: "Loved it"
      });
      testReviewId = review.id;
    });

    it("should add host response to review", async () => {
      const response = "Thank you so much for your kind words!";
      
      const updated = await reviewsQueryManager.addHostResponse(testReviewId, response);

      expect(updated.hostResponse).toBe(response);
      expect(updated.hostResponseAt).toBeDefined();
    });
  });

  describe("voteHelpful", () => {
    let testReviewId: string;
    let votingUserId: string;

    beforeEach(async () => {
      const review = await reviewsQueryManager.create({
        reservationId: uuidv4(),
        experienceId: testExperienceId,
        userId: testUserId,
        hostId: testHostId,
        rating: 5,
        title: "Helpful review",
        comment: "This is helpful"
      });
      testReviewId = review.id;
      votingUserId = uuidv4();
    });

    it("should add helpful vote", async () => {
      const vote = await reviewsQueryManager.voteHelpful(testReviewId, votingUserId);

      expect(vote).toBeDefined();
      expect(vote?.reviewId).toBe(testReviewId);
      expect(vote?.userId).toBe(votingUserId);
    });

    it("should return null when voting twice", async () => {
      await reviewsQueryManager.voteHelpful(testReviewId, votingUserId);
      const secondVote = await reviewsQueryManager.voteHelpful(testReviewId, votingUserId);

      expect(secondVote).toBeNull();
    });
  });

  describe("getReviews", () => {
    beforeEach(async () => {
      // Create multiple reviews
      for (let i = 0; i < 5; i++) {
        await reviewsQueryManager.create({
          reservationId: uuidv4(),
          experienceId: testExperienceId,
          userId: testUserId,
          hostId: testHostId,
          rating: i + 1,
          title: `Review ${i + 1}`,
          comment: `Comment ${i + 1}`
        });
      }
    });

    it("should get reviews with filters", async () => {
      const reviews = await reviewsQueryManager.getReviews({
        experienceId: testExperienceId,
        minRating: 3,
        limit: 10
      });

      expect(reviews.length).toBeGreaterThan(0);
      reviews.forEach(review => {
        expect(review.rating).toBeGreaterThanOrEqual(3);
      });
    });

    it("should order reviews by rating", async () => {
      const reviews = await reviewsQueryManager.getReviews({
        experienceId: testExperienceId,
        orderBy: 'highest'
      });

      for (let i = 0; i < reviews.length - 1; i++) {
        expect(reviews[i].rating).toBeGreaterThanOrEqual(reviews[i + 1].rating);
      }
    });
  });

  describe("getExperienceStats", () => {
    it("should calculate experience statistics", async () => {
      const stats = await reviewsQueryManager.getExperienceStats(testExperienceId);

      expect(stats).toBeDefined();
      expect(stats.experienceId).toBe(testExperienceId);
      expect(stats.averageRating).toBeGreaterThan(0);
      expect(stats.totalReviews).toBeGreaterThan(0);
      expect(stats.ratingDistribution).toBeDefined();
      expect(Object.keys(stats.ratingDistribution)).toHaveLength(5);
    });
  });
});