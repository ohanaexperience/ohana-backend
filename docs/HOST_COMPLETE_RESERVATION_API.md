# Host Complete Reservation API

## Overview
This endpoint allows hosts to mark a reservation as completed after an experience has taken place. Completing a reservation enables guest reviews, finalizes payments, and updates metrics.

## Endpoint

### Complete Reservation
`POST /v1/host/reservations/{reservationId}/complete`

**Authentication:** Required (Host only)

**Path Parameters:**
- `reservationId` (string, UUID, required): The ID of the reservation to complete

**Request Body:**
```json
{
  "actualAttendance": 3,           // Optional: Number of guests who actually attended
  "hostNotes": "Great group!",      // Optional: Host's notes about the experience (max 1000 chars)
  "incidentReport": "...",          // Optional: Report any incidents (max 2000 chars)
  "noShow": false                   // Optional: Mark if guests didn't show up
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
    "userId": "user-789",
    "numberOfGuests": 4,
    "totalPrice": 20000,
    "updatedAt": "2024-01-15T14:30:00Z"
  },
  "message": "Reservation completed successfully"
}
```

**Error Responses:**

- **404 Not Found:**
```json
{
  "error": "RESERVATION_NOT_FOUND",
  "message": "Reservation not found."
}
```

- **403 Forbidden:**
```json
{
  "error": "RESERVATION_FORBIDDEN_COMPLETE",
  "message": "You do not have permission to complete this reservation."
}
```

- **400 Bad Request:**
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

## Business Rules

1. **Authorization:** Only the host who owns the experience can complete a reservation
2. **Status Requirement:** Reservation must be in "confirmed" status
3. **Timing:** Can be completed starting from 1 hour before the experience time
4. **Events Logged:** 
   - Completion event with all details
   - Incident report (if provided) logged separately for review

## Post-Completion Actions

When a reservation is successfully completed:
1. Reservation status changes to "completed"
2. Guests become eligible to leave reviews
3. Host metrics are updated
4. Payment finalization is triggered (if using escrow)
5. Notifications are sent to guests (future implementation)

## Usage Example

```bash
curl -X POST https://api.example.com/v1/host/reservations/res-123/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actualAttendance": 4,
    "hostNotes": "Everyone showed up and had a great time!"
  }'
```

## Notes

- The `actualAttendance` field helps track no-shows and partial attendance
- Use `incidentReport` for any issues that require admin review
- The endpoint includes automatic detection of expired holds and prevents double-completion
- All completion events are tracked for audit purposes