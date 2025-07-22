# Extensible Collections System

## Why No Enum?

We removed the PostgreSQL enum constraint on the `type` column to make the system truly extensible. With enums, adding new collection types would require database migrations. Now, you can add new collection types simply by inserting new records.

## Benefits

1. **No Database Migrations** - Add new collection types without schema changes
2. **Partner Collections** - Create partner-specific collections on the fly
3. **Seasonal Collections** - Add holiday or event-specific collections dynamically
4. **A/B Testing** - Test different collection strategies without code changes
5. **Regional Collections** - Create location-specific collections

## Examples

### Adding New Collection Types

```typescript
// In your constants file, add new types (optional, for type safety)
export const COLLECTION_TYPES = {
    // ... existing types ...
    VALENTINE_SPECIAL: "valentine_special",
    SUMMER_2024: "summer_2024",
    VISA_EXCLUSIVE: "visa_exclusive",
    BANGKOK_FOODIE: "bangkok_foodie",
    COUPLES_RETREAT: "couples_retreat",
} as const;
```

### Creating Dynamic Collections

```typescript
// Valentine's Day Collection
await db.experienceCollections.createCollection({
    slug: "valentines-2024",
    name: "Valentine's Day Special",
    description: "Romantic experiences for couples",
    type: "valentine_special", // Any string works!
    metadata: {
        displayLimit: 12,
        filters: {
            tags: ["romantic", "couples", "date-night"]
        },
        validFrom: "2024-02-01",
        validUntil: "2024-02-15"
    }
});

// Partner Collection
await db.experienceCollections.createCollection({
    slug: "amex-platinum-exclusive",
    name: "American Express Platinum Exclusive",
    description: "Curated experiences for Amex Platinum cardholders",
    type: "partner_amex_platinum",
    metadata: {
        displayLimit: 20,
        requiresAuth: true,
        partnerCode: "AMEX_PLAT_2024",
        discountPercentage: 10
    }
});

// City-Specific Collection
await db.experienceCollections.createCollection({
    slug: "bangkok-street-food-masters",
    name: "Bangkok Street Food Masters",
    description: "Curated by local food critics",
    type: "city_bangkok_food",
    metadata: {
        displayLimit: 15,
        filters: {
            categorySlug: "food-drink",
            city: "Bangkok",
            minRating: 4.5
        },
        curatedBy: "Bangkok Food Critics Association"
    }
});

// Algorithmic Collection with Custom Rules
await db.experienceCollections.createCollection({
    slug: "instagram-worthy",
    name: "Instagram Worthy Experiences",
    description: "Most photographed experiences",
    type: "social_media_trending",
    metadata: {
        algorithm: "social_engagement",
        displayLimit: 20,
        refreshIntervalHours: 6,
        filters: {
            hasPhotogenicLocation: true,
            minInstagramTags: 1000
        }
    }
});
```

## Frontend Usage

```typescript
// Get collections by type pattern
const valentineCollections = await fetch(
    '/v1/experiences/collections?type_like=valentine'
);

// Get partner collections
const partnerCollections = await fetch(
    '/v1/experiences/collections?type_like=partner_'
);

// Get all seasonal collections
const seasonalCollections = await fetch(
    '/v1/experiences/collections?type_like=seasonal'
);
```

## Best Practices

1. **Use Prefixes** for organization:
   - `partner_` for partner collections
   - `seasonal_` for time-based collections
   - `city_` for location-specific collections
   - `promo_` for promotional collections

2. **Metadata Standards**:
   ```typescript
   {
     displayLimit: number,
     refreshIntervalHours?: number,
     validFrom?: string, // ISO date
     validUntil?: string, // ISO date
     requiresAuth?: boolean,
     filters?: Record<string, any>,
     algorithm?: string,
     curatedBy?: string,
     partnerCode?: string
   }
   ```

3. **Slug Naming**:
   - Use descriptive, URL-friendly slugs
   - Include year/season for time-based collections
   - Include partner name for partner collections

## Migration from Boolean Flags

If you previously used boolean flags like `isFeatured`, `isTopPick`:

```sql
-- Old way (limited to predefined flags)
SELECT * FROM experiences WHERE is_featured = true;
SELECT * FROM experiences WHERE is_top_pick = true;

-- New way (unlimited collection types)
SELECT e.* FROM experiences e
JOIN experience_collection_items eci ON e.id = eci.experience_id
JOIN experience_collections c ON eci.collection_id = c.id
WHERE c.slug = 'featured';

-- Or any custom collection
WHERE c.slug = 'valentines-2024';
WHERE c.type LIKE 'partner_%';
WHERE c.metadata->>'curatedBy' = 'Bangkok Food Critics';
```

This approach scales infinitely without schema changes!