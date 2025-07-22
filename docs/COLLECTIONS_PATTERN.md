# Experience Collections Pattern

## Why This Pattern?

### 1. **Scalability**
- Add new collection types without schema changes
- No database migrations for new curated lists
- Supports unlimited collection types

### 2. **Flexibility**
- Manual curation: Hand-pick experiences
- Algorithmic: Auto-populate based on rules
- Location-based: Dynamic based on user location
- Time-based: Seasonal or temporary collections

### 3. **Performance**
- Single query to get any collection
- Efficient indexing on junction table
- Can cache collection results

### 4. **Business Features**
- A/B testing different collections
- Personalized collections per user
- Regional collections
- Partner/sponsored collections
- Seasonal promotions

## Usage Examples

### Creating Collections
```typescript
// Featured experiences
await db.experienceCollections.createCollection({
    slug: 'summer-2024-featured',
    name: 'Summer 2024 Featured',
    type: 'seasonal',
    metadata: {
        displayLimit: 8,
        filters: { 
            tags: ['summer', 'outdoor'] 
        }
    }
});

// Partner collection
await db.experienceCollections.createCollection({
    slug: 'visa-exclusive',
    name: 'Visa Card Exclusive Experiences',
    type: 'custom',
    metadata: {
        displayLimit: 20,
        filters: { 
            partnerCode: 'VISA2024' 
        }
    }
});
```

### Getting Collections
```typescript
// Get featured experiences
const featured = await db.experienceCollections
    .getExperiencesByCollection('featured');

// Get nearby experiences (dynamic)
const nearby = await db.experienceCollections
    .getExperiencesByCollection('near-you', {
        latitude: 13.7563,
        longitude: 100.5018,
        limit: 10
    });

// Get trending (algorithmic)
const trending = await db.experienceCollections
    .getExperiencesByCollection('trending-this-week');
```

### Managing Collections
```typescript
// Add experience to collection
await db.experienceCollections.addExperienceToCollection(
    collectionId, 
    experienceId,
    position // optional
);

// Reorder
await db.experienceCollections.reorderCollectionItem(
    collectionId,
    experienceId,
    newPosition
);

// Remove
await db.experienceCollections.removeExperienceFromCollection(
    collectionId,
    experienceId
);
```

## API Endpoints

### Public Endpoints
```
GET /experiences/collections
- List all active public collections

GET /experiences/collections/{slug}
- Get experiences in a specific collection
- Query params: ?limit=10&latitude=13.75&longitude=100.50

GET /experiences/collections/{slug}/info
- Get collection metadata
```

### Admin Endpoints
```
POST /admin/collections
- Create new collection

PUT /admin/collections/{id}
- Update collection

POST /admin/collections/{id}/items
- Add experience to collection

DELETE /admin/collections/{id}/items/{experienceId}
- Remove experience from collection

PUT /admin/collections/{id}/items/{experienceId}/position
- Reorder experience in collection
```

## Alternative Patterns

### 1. **Tags/Labels System**
```typescript
// experience_tags table
{
    id, experience_id, tag_name, tag_type
}
// Pros: Very flexible, good for filtering
// Cons: Can get messy, harder to order
```

### 2. **JSON Metadata**
```typescript
// In experiences table
{
    metadata: {
        collections: ['featured', 'top-picks'],
        rankings: { featured: 1, topPicks: 5 }
    }
}
// Pros: Simple, no extra tables
// Cons: Poor query performance, limited features
```

### 3. **Bit Flags**
```typescript
// Using integer column with bit flags
{
    collection_flags: 0b0101 // featured | top_picks
}
// Pros: Very efficient storage
// Cons: Limited to 32/64 collections, complex queries
```

## Migration Strategy

To migrate from boolean columns:

```sql
-- 1. Create collections
INSERT INTO experience_collections (slug, name, type) VALUES
('featured', 'Featured Experiences', 'featured'),
('ohana-top-picks', 'Ohana Top Picks', 'top_picks');

-- 2. Migrate existing featured experiences
INSERT INTO experience_collection_items (collection_id, experience_id, position)
SELECT 
    c.id,
    e.id,
    ROW_NUMBER() OVER (ORDER BY e.featured_order, e.featured_at DESC)
FROM experiences e
JOIN experience_collections c ON c.slug = 'featured'
WHERE e.is_featured = true;

-- 3. Drop old columns (after verification)
ALTER TABLE experiences 
DROP COLUMN is_featured,
DROP COLUMN featured_at,
DROP COLUMN featured_order;
```