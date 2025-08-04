# Host Reservations Management API

## Overview
These endpoints allow hosts to view and manage reservations for their experiences. Hosts can view all reservations across their experiences or filter by specific criteria.

## Endpoints

### 1. Get All Host Reservations
`GET /v1/host/reservations`

Get all reservations for all experiences owned by the authenticated host.

**Authentication:** Required (Host only)

**Query Parameters:**
- `experienceId` (string, UUID, optional): Filter by specific experience ID
- `status` (string, optional): Filter by reservation status
  - Values: `held`, `pending`, `confirmed`, `cancelled`, `completed`, `refunded`
- `fromDate` (string, ISO 8601, optional): Filter reservations from this date
- `toDate` (string, ISO 8601, optional): Filter reservations until this date
- `limit` (number, optional): Number of results per page (default: 20, max: 100)
- `offset` (number, optional): Number of results to skip (default: 0)

**Success Response (200):**
```json
{
  "success": true,
  "reservations": [
    {
      "id": "res-123",
      "status": "confirmed",
      "reservationReference": "REF-ABC123",
      "numberOfGuests": 4,
      "totalPrice": 20000,
      "specialRequests": "Vegetarian meal preference",
      "paymentStatus": "paid",
      "createdAt": "2024-01-10T10:00:00Z",
      "experience": {
        "id": "exp-456",
        "title": "Sunset Kayaking Tour",
        "coverImage": "https://cdn.example.com/image.jpg"
      },
      "timeSlot": {
        "id": "slot-789",
        "slotDateTime": "2024-02-15T16:00:00Z",
        "localDate": "2024-02-15",
        "localTime": "16:00"
      },
      "guest": {
        "id": "user-111",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "profileImage": "https://cdn.example.com/profile.jpg"
      }
    }
  ],
  "total": 45,
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 2. Get Experience Reservations
`GET /v1/host/experiences/{experienceId}/reservations`

Get all reservations for a specific experience owned by the authenticated host.

**Authentication:** Required (Host only)

**Path Parameters:**
- `experienceId` (string, UUID, required): The ID of the experience

**Query Parameters:**
- `status` (string, optional): Filter by reservation status
- `fromDate` (string, ISO 8601, optional): Filter reservations from this date
- `toDate` (string, ISO 8601, optional): Filter reservations until this date
- `limit` (number, optional): Number of results per page (default: 20, max: 100)
- `offset` (number, optional): Number of results to skip (default: 0)

**Success Response:** Same format as Get All Host Reservations

### 3. Complete Reservation
`POST /v1/host/reservations/{reservationId}/complete`

Mark a reservation as completed after the experience has taken place.

**Authentication:** Required (Host only)

**Path Parameters:**
- `reservationId` (string, UUID, required): The ID of the reservation to complete

**Request Body:**
```json
{
  "actualAttendance": 3,
  "hostNotes": "Great group, very engaged!",
  "incidentReport": null,
  "noShow": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "reservation": {
    "id": "res-123",
    "status": "completed",
    "experienceId": "exp-456",
    "numberOfGuests": 4,
    "totalPrice": 20000,
    "updatedAt": "2024-01-15T14:30:00Z"
  },
  "message": "Reservation completed successfully"
}
```

## Error Responses

### 403 Forbidden
```json
{
  "error": "EXPERIENCE_FORBIDDEN_UPDATE",
  "message": "You do not have permission to view reservations for this experience"
}
```

```json
{
  "error": "RESERVATION_FORBIDDEN_COMPLETE",
  "message": "You do not have permission to complete this reservation."
}
```

### 404 Not Found
```json
{
  "error": "RESERVATION_NOT_FOUND",
  "message": "Reservation not found."
}
```

### 400 Bad Request
```json
{
  "error": "RESERVATION_INVALID_STATUS_TRANSITION",
  "message": "Invalid reservation status transition. Only confirmed reservations can be completed."
}
```

```json
{
  "error": "RESERVATION_EXPERIENCE_NOT_STARTED",
  "message": "Cannot complete reservation before experience has started."
}
```

## Guest Information

The `guest` field in responses will vary based on whether the guest has a user account:

**Registered User:**
```json
{
  "id": "user-111",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "profileImage": "https://cdn.example.com/profile.jpg"
}
```

**Guest Checkout (No Account):**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890"
}
```

## Usage Examples

### Get all confirmed reservations for next week
```bash
curl -X GET "https://api.example.com/v1/host/reservations?status=confirmed&fromDate=2024-02-01T00:00:00Z&toDate=2024-02-07T23:59:59Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get reservations for a specific experience
```bash
curl -X GET "https://api.example.com/v1/host/experiences/exp-456/reservations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Complete a reservation with attendance tracking
```bash
curl -X POST "https://api.example.com/v1/host/reservations/res-123/complete" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actualAttendance": 4,
    "hostNotes": "All guests attended, great experience!"
  }'
```

## Notes

- Reservations are ordered by time slot date in descending order (most recent first)
- The host must own the experience to view or manage its reservations
- Completing a reservation enables guest reviews and finalizes payments
- Date filtering is applied to the experience time slot, not the reservation creation date
- All timestamps are in UTC format