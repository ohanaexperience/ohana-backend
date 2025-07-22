// Collection types - can be extended without database changes
export const COLLECTION_TYPES = {
    FEATURED: "featured",
    TOP_PICKS: "top_picks",
    NEAR_YOU: "near_you",
    TRENDING: "trending",
    NEW_ARRIVALS: "new_arrivals",
    SEASONAL: "seasonal",
    EDITOR_CHOICE: "editor_choice",
    BEST_SELLERS: "best_sellers",
    CUSTOM: "custom",
    PARTNER: "partner",
    PROMOTION: "promotion",
    HOLIDAY: "holiday",
    WEEKEND: "weekend",
    // Add more types as needed without database changes
} as const;

export type CollectionType = typeof COLLECTION_TYPES[keyof typeof COLLECTION_TYPES];

export const DEFAULT_COLLECTIONS = [
    {
        slug: "featured",
        name: "Featured Experiences",
        description: "Hand-picked experiences showcased on our homepage",
        type: COLLECTION_TYPES.FEATURED,
        isActive: true,
        isPublic: true,
        sortOrder: 1,
        metadata: {
            displayLimit: 6,
            refreshIntervalHours: 168 // Weekly refresh
        }
    },
    {
        slug: "ohana-top-picks",
        name: "Ohana Top Picks",
        description: "Our team's favorite experiences",
        type: COLLECTION_TYPES.TOP_PICKS,
        isActive: true,
        isPublic: true,
        sortOrder: 2,
        metadata: {
            displayLimit: 10
        }
    },
    {
        slug: "near-you",
        name: "Experiences Near You",
        description: "Top-rated experiences in your area",
        type: COLLECTION_TYPES.NEAR_YOU,
        isActive: true,
        isPublic: true,
        sortOrder: 3,
        metadata: {
            requiresLocation: true,
            maxDistanceKm: 50,
            algorithm: "popularity",
            displayLimit: 10,
            refreshIntervalHours: 24 // Daily refresh
        }
    },
    {
        slug: "trending-this-week",
        name: "Trending This Week",
        description: "Most booked experiences this week",
        type: COLLECTION_TYPES.TRENDING,
        isActive: true,
        isPublic: true,
        sortOrder: 4,
        metadata: {
            algorithm: "popularity",
            displayLimit: 10,
            refreshIntervalHours: 24
        }
    },
    {
        slug: "new-experiences",
        name: "New Experiences",
        description: "Recently added experiences",
        type: COLLECTION_TYPES.NEW_ARRIVALS,
        isActive: true,
        isPublic: true,
        sortOrder: 5,
        metadata: {
            algorithm: "recency",
            displayLimit: 10,
            refreshIntervalHours: 12
        }
    },
    {
        slug: "best-sellers",
        name: "Best Sellers",
        description: "Most popular experiences based on bookings",
        type: COLLECTION_TYPES.BEST_SELLERS,
        isActive: true,
        isPublic: true,
        sortOrder: 6,
        metadata: {
            algorithm: "popularity",
            displayLimit: 20,
            refreshIntervalHours: 24
        }
    },
    {
        slug: "budget-friendly",
        name: "Budget Friendly",
        description: "Amazing experiences under $50",
        type: COLLECTION_TYPES.CUSTOM,
        isActive: true,
        isPublic: true,
        sortOrder: 7,
        metadata: {
            displayLimit: 10,
            filters: {
                maxPrice: 5000 // $50 in cents
            }
        }
    },
    {
        slug: "luxury-experiences",
        name: "Luxury Experiences",
        description: "Premium experiences for special occasions",
        type: COLLECTION_TYPES.CUSTOM,
        isActive: true,
        isPublic: true,
        sortOrder: 8,
        metadata: {
            displayLimit: 10,
            filters: {
                minPrice: 20000 // $200 in cents
            }
        }
    }
];