import { v4 as uuidv4 } from "uuid";
import { CreateReviewData } from "@/database/postgres/query_managers/reviewQueryManager";

export const generateReviewData = (overrides?: Partial<CreateReviewData>): CreateReviewData => {
  return {
    reservationId: uuidv4(),
    experienceId: uuidv4(),
    userId: uuidv4(),
    hostId: uuidv4(),
    rating: 5,
    title: "Great experience!",
    comment: "Had an amazing time. The host was very knowledgeable and friendly.",
    ...overrides
  };
};

export const generateReviewImages = (count: number = 2): string[] => {
  return Array.from({ length: count }, (_, i) => 
    `https://example.com/review-image-${i + 1}.jpg`
  );
};

export const generateMockReview = (overrides?: any) => {
  const id = uuidv4();
  const createdAt = new Date();
  
  return {
    id,
    reservationId: uuidv4(),
    experienceId: uuidv4(),
    userId: uuidv4(),
    hostId: uuidv4(),
    rating: 5,
    title: "Amazing experience",
    comment: "Loved every moment of it",
    hostResponse: null,
    hostResponseAt: null,
    isPublished: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
};

export const generateMockReservation = (overrides?: any) => {
  return {
    id: uuidv4(),
    userId: uuidv4(),
    experienceId: uuidv4(),
    timeSlotId: uuidv4(),
    guestCount: 2,
    pricePerPerson: 5000,
    totalPrice: 10000,
    status: "completed",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

export const generateMockExperience = (overrides?: any) => {
  return {
    id: uuidv4(),
    hostId: uuidv4(),
    title: "Test Experience",
    tagline: "An amazing test experience",
    categoryId: 1,
    subCategoryId: 1,
    languages: ["en"],
    type: "GROUP",
    description: "Join us for an unforgettable adventure",
    startingLocationAddress: "123 Test Street",
    startingLocation: [40.7128, -74.0060],
    endingLocationAddress: "456 Test Avenue",
    endingLocation: [40.7580, -73.9855],
    meetingLocationInstructions: "Meet at the main entrance",
    pricePerPerson: 5000,
    cancellationPolicy: "flexible",
    minGuests: 1,
    maxGuests: 10,
    durationHours: 2,
    timezone: "America/New_York",
    averageRating: 0,
    totalReviews: 0,
    ...overrides
  };
};

export const generateMockUser = (overrides?: any) => {
  const id = uuidv4();
  return {
    id,
    email: `user-${id}@example.com`,
    name: "Test User",
    profileImage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

export const generateMockHost = (overrides?: any) => {
  return {
    id: uuidv4(),
    userId: uuidv4(),
    bio: "Experienced tour guide with 10 years of experience",
    languages: ["en", "es"],
    socials: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

export const generateReviewStats = (experienceId: string, overrides?: any) => {
  return {
    experienceId,
    averageRating: 4.5,
    totalReviews: 42,
    ratingDistribution: {
      1: 2,
      2: 3,
      3: 5,
      4: 12,
      5: 20
    },
    ...overrides
  };
};

export const generateBulkReviews = (count: number, experienceId: string, hostId: string) => {
  return Array.from({ length: count }, (_, i) => {
    const rating = Math.floor(Math.random() * 5) + 1;
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    return generateMockReview({
      experienceId,
      hostId,
      rating,
      title: `Review ${i + 1}`,
      comment: `This is review number ${i + 1}`,
      createdAt: date,
      updatedAt: date
    });
  });
};