# Get User Reservations API Documentation

## Endpoint
```
GET /v1/reservations
```

## Authentication
Required - User must be authenticated with a valid JWT token

## Query Parameters
- `status` (optional): Filter reservations by status
  - Valid values: `held`, `pending`, `confirmed`, `cancelled`, `completed`, `refunded`
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Number of results to skip for pagination (default: 0)

## Performance Optimization
This endpoint uses a single optimized SQL query with LEFT JOINs to fetch all reservation data efficiently:
- Eliminates N+1 query problems
- Single database round trip for all data
- Retrieves reservations with their associated experiences and time slots in one query
- Currently applies pagination in memory (consider moving to SQL LIMIT/OFFSET for very large datasets)

## Example Requests

### Get all user reservations
```javascript
const response = await fetch('https://api.example.com/v1/reservations', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Get only confirmed reservations
```javascript
const response = await fetch('https://api.example.com/v1/reservations?status=confirmed', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
```

### With pagination
```javascript
const response = await fetch('https://api.example.com/v1/reservations?limit=10&offset=20', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
```

## Response Format
```json
{
  "reservations": [
    {
      "id": "uuid",
      "userId": "uuid",
      "experienceId": "uuid",
      "timeSlotId": "uuid",
      "numberOfGuests": 2,
      "totalPrice": 10000,
      "originalPrice": 10000,
      "discountApplied": 0,
      "discountType": null,
      "status": "confirmed",
      "reservationReference": "RES-ABC123",
      "guestName": "John Doe",
      "guestEmail": "john@example.com",
      "guestPhone": "+1234567890",
      "specialRequests": "Vegetarian meal preferred",
      "paymentIntentId": "pi_1234567890",
      "paymentStatus": "paid",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z",
      "experience": {
        "id": "uuid",
        "title": "Sunset Kayaking Tour",
        "tagline": "Experience the beauty of sunset from the water",
        "type": "outdoor_adventure",
        "description": "Join us for a memorable 2-hour kayaking adventure...",
        "startingLocationAddress": "123 Harbor Drive, Marina Bay",
        "endingLocationAddress": "123 Harbor Drive, Marina Bay",
        "meetingLocationInstructions": "Meet at the blue kayak shack near the main pier",
        "coverImage": {
          "url": "https://cdn.example.com/images/sunset-kayak-cover.jpg",
          "width": 1920,
          "height": 1080,
          "mimeType": "image/jpeg"
        },
        "galleryImages": [
          {
            "url": "https://cdn.example.com/images/gallery-1.jpg",
            "width": 1200,
            "height": 800,
            "mimeType": "image/jpeg"
          }
        ],
        "pricePerPerson": 5000,
        "durationHours": 2,
        "cancellationPolicy": "flexible",
        "categoryId": 3,
        "subCategoryId": 12,
        "minGuests": 1,
        "maxGuests": 8,
        "host": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Smith",
          "profileImage": {
            "url": "https://cdn.example.com/images/host-profile.jpg",
            "width": 200,
            "height": 200,
            "mimeType": "image/jpeg"
          }
        }
      },
      "timeSlot": {
        "id": "uuid",
        "slotDateTime": "2024-01-20T17:00:00Z",
        "localDate": "2024-01-20",
        "localTime": "17:00"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Response Object Fields

### Experience Object
- `id`: Unique identifier
- `title`: Name of the experience
- `tagline`: Short description
- `type`: Experience type (e.g., outdoor_adventure, food_and_drink, etc.)
- `description`: Full description
- `startingLocationAddress`: Where the experience begins
- `endingLocationAddress`: Where the experience ends
- `meetingLocationInstructions`: Detailed meeting instructions
- `coverImage`: Main image object with URL, dimensions, and mime type
- `galleryImages`: Array of additional images
- `pricePerPerson`: Price in cents (5000 = $50.00)
- `durationHours`: How long the experience lasts
- `cancellationPolicy`: flexible, moderate, or strict
- `categoryId`: Main category ID
- `subCategoryId`: Subcategory ID
- `minGuests`: Minimum number of guests required
- `maxGuests`: Maximum capacity
- `host`: Host information object

### Host Object (nested within experience)
- `id`: Host's user ID
- `firstName`: Host's first name
- `lastName`: Host's last name
- `profileImage`: Host's profile image object (url, width, height, mimeType)

### Time Slot Object
- `id`: Time slot identifier
- `slotDateTime`: Full datetime in UTC
- `localDate`: Date in local timezone (YYYY-MM-DD)
- `localTime`: Time in local timezone (HH:MM)

## Error Responses

### 401 Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "User ID not found in token"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Implementation Details

### Query Construction
The backend constructs an efficient query using Drizzle ORM:
```typescript
const results = await db
  .select({
    reservation: reservationsTable,
    experience: experiencesTable,
    timeSlot: experienceTimeSlotsTable,
    host: usersTable,
  })
  .from(reservationsTable)
  .leftJoin(experiencesTable, eq(reservationsTable.experienceId, experiencesTable.id))
  .leftJoin(experienceTimeSlotsTable, eq(reservationsTable.timeSlotId, experienceTimeSlotsTable.id))
  .leftJoin(usersTable, eq(experiencesTable.hostId, usersTable.id))
  .where(and(...whereConditions))
  .orderBy(desc(reservationsTable.createdAt))
  .limit(limit)
  .offset(offset);
```

This generates a single SQL query similar to:
```sql
SELECT 
  r.*, 
  e.*, 
  t.*,
  u.*
FROM reservations r
LEFT JOIN experiences e ON r.experience_id = e.id
LEFT JOIN experience_time_slots t ON r.time_slot_id = t.id
LEFT JOIN users u ON e.host_id = u.id
WHERE r.user_id = $1
  AND r.status = $2  -- if status filter provided
ORDER BY r.created_at DESC
LIMIT $3 OFFSET $4
```

### Performance Benefits
- **Single Query**: All data fetched in one database round trip
- **Database-level Pagination**: Uses SQL LIMIT/OFFSET for efficiency
- **Sorted Results**: Orders by creation date (newest first)
- **Separate Count Query**: Accurate total count for pagination

## Frontend Implementation Example

```javascript
// React hook example
const useUserReservations = (status) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchReservations = async (limit = 20, offset = 0) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...(status && { status }),
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      const response = await fetch(`/api/v1/reservations?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }
      
      const data = await response.json();
      setReservations(data.reservations);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [status]);

  return { reservations, loading, error, pagination, refetch: fetchReservations };
};

// Usage in component
function MyReservations() {
  const { reservations, loading, error, pagination } = useUserReservations('confirmed');
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div>
      {reservations.map(reservation => (
        <ReservationCard 
          key={reservation.id}
          reservation={reservation}
          experience={reservation.experience}
          timeSlot={reservation.timeSlot}
        />
      ))}
      {pagination.hasMore && (
        <LoadMoreButton onClick={() => fetchReservations(20, pagination.offset + 20)} />
      )}
    </div>
  );
}
```