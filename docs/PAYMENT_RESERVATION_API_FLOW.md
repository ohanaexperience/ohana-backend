# Payment & Reservation API Integration Flow

## Overview
The system uses a two-phase booking approach: **Hold → Payment → Confirmation**

## API Flow Sequence

### 1. Authentication (Required First)
```http
POST https://cognito-idp.{region}.amazonaws.com/
Authorization: AWS Cognito JWT Token
```
All subsequent API calls require the JWT token in the Authorization header.

---

## Main Booking Flow

### Step 1: Create Hold (Reserve Inventory)
**Purpose:** Temporarily reserves the spot for 15 minutes

```http
POST /v1/reservations/hold
Headers:
  Authorization: Bearer {jwt_token}
  X-Idempotency-Key: {unique_uuid}
  Content-Type: application/json

Body:
{
  "experienceId": "uuid",
  "timeSlotId": "uuid",
  "numberOfGuests": 2,
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",  // optional
  "specialRequests": "..."       // optional
}

Response (200):
{
  "reservation": {
    "id": "hold_uuid",
    "status": "held",
    "holdExpiresAt": "2024-01-01T12:15:00Z",  // 15 minutes from now
    "totalPrice": 15000,  // Amount in cents
    "originalPrice": 20000,
    "discountApplied": 5000
  },
  "appliedDiscounts": {
    "groupDiscount": { "amount": 3000, "type": "group_5_plus" },
    "earlyBirdDiscount": { "amount": 2000, "type": "early_bird" },
    "totalDiscount": 5000
  },
  "holdDurationMinutes": 15
}
```

**Important:** Save the `reservation.id` and `holdExpiresAt` for the next steps.

### Step 2A: Get Payment Methods (Optional)
**Purpose:** Fetch user's saved payment methods

```http
GET /v1/payments/methods
Headers:
  Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "payment_method_uuid",
      "type": "card",
      "last4": "4242",
      "brand": "Visa",
      "expMonth": "12",
      "expYear": "2025",
      "isDefault": true,
      "nickname": "Personal Card",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Step 2B: Convert Hold to Reservation
**Purpose:** Initiates payment and converts hold to pending reservation

```http
POST /v1/reservations/hold/convert
Headers:
  Authorization: Bearer {jwt_token}
  X-Idempotency-Key: {original_key}-convert
  Content-Type: application/json

Body (New Card):
{
  "holdId": "hold_uuid_from_step_1",
  "savePaymentMethod": true  // optional
}

Body (Saved Card):
{
  "holdId": "hold_uuid_from_step_1",
  "paymentMethodId": "payment_method_uuid",  // from Step 2A
  "savePaymentMethod": false
}

Response (200):
{
  "reservation": {
    "id": "reservation_uuid",
    "status": "pending",
    "paymentIntentId": "pi_stripe_id"
  },
  "paymentClientSecret": "pi_xxx_secret_xxx",  // Use with Stripe.js
  "requiresAction": false  // true if 3D Secure needed
}
```

**Important:** Use the `paymentClientSecret` with Stripe.js to complete payment on frontend.

### Step 3: Complete Payment with Stripe (Frontend)
**Purpose:** Collect payment details and confirm payment

```javascript
// Frontend JavaScript using Stripe.js
const stripe = Stripe('your_publishable_key');

// For new card
const result = await stripe.confirmPayment({
  clientSecret: paymentClientSecret,  // from Step 2B
  confirmParams: {
    payment_method: {
      card: cardElement,
      billing_details: {
        email: 'john@example.com'
      }
    },
    return_url: 'https://yoursite.com/booking/confirmation'
  },
  redirect: 'if_required'  // Avoid redirect unless 3D Secure needed
});

// For saved card (if 3D Secure required)
const result = await stripe.confirmCardPayment(paymentClientSecret);
```

### Step 4: Confirm Reservation (If Manual Confirmation)
**Purpose:** Finalize the reservation after payment success

```http
POST /v1/reservations/confirm
Headers:
  Authorization: Bearer {jwt_token}
  Content-Type: application/json

Body:
{
  "reservationId": "reservation_uuid",
  "paymentIntentId": "pi_stripe_id"
}

Response (200):
{
  "reservation": {
    "id": "reservation_uuid",
    "status": "confirmed",
    "paymentStatus": "paid",
    "reservationReference": "ABC123DEF456"
  },
  "payment": {
    "paymentId": "payment_uuid",
    "status": "captured",
    "chargeId": "ch_stripe_id"
  }
}
```

---

## Additional Operations

### Check Payment Status (Polling)
**When to use:** After 3D Secure redirect or to check async payment status

```http
GET /v1/reservations/{reservationId}/payment-status
Headers:
  Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "data": {
    "reservationStatus": "pending",
    "paymentIntentId": "pi_xxx",
    "stripeStatus": "succeeded",
    "requiresAction": false,
    "actionType": null
  }
}
```

### Get User's Reservations
**Purpose:** List all reservations for the logged-in user

```http
GET /v1/reservations?status=confirmed&limit=10&offset=0
Headers:
  Authorization: Bearer {jwt_token}

Response (200):
{
  "reservations": [
    {
      "id": "reservation_uuid",
      "experienceId": "exp_uuid",
      "status": "confirmed",
      "totalPrice": 15000,
      "experience": { ... },
      "timeSlot": { ... }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### Add Payment Method
**Purpose:** Save a new payment method for future use

```http
POST /v1/payments/methods
Headers:
  Authorization: Bearer {jwt_token}
  Content-Type: application/json

Body:
{
  "paymentMethodId": "pm_stripe_id",  // From Stripe.js
  "nickname": "Work Card"  // optional
}

Response (200):
{
  "success": true,
  "data": {
    "id": "payment_method_uuid",
    "type": "card",
    "last4": "4242",
    "brand": "Visa",
    "expMonth": "12",
    "expYear": "2025",
    "isDefault": false,
    "nickname": "Work Card",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Delete Payment Method
```http
DELETE /v1/payments/methods/{paymentMethodId}
Headers:
  Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "message": "Payment method removed successfully"
}
```

### Set Default Payment Method
```http
PUT /v1/payments/methods/{paymentMethodId}/default
Headers:
  Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "message": "Default payment method updated successfully"
}
```

---

## Error Handling

### Common Error Responses

```json
// 400 - Bad Request
{
  "error": "TIME_SLOT_NOT_AVAILABLE",
  "message": "This time slot is no longer available"
}

// 400 - Hold Expired
{
  "error": "HOLD_EXPIRED",
  "message": "The hold on this reservation has expired"
}

// 400 - Payment Failed
{
  "error": "PAYMENT_CARD_DECLINED",
  "message": "Your card was declined"
}

// 404 - Not Found
{
  "error": "RESERVATION_NOT_FOUND",
  "message": "Reservation not found"
}

// 500 - Server Error
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

### Error Codes to Handle
- `TIME_SLOT_NOT_FOUND` - Selected time no longer exists
- `TIME_SLOT_NOT_AVAILABLE` - Time slot is full or unavailable
- `NOT_ENOUGH_CAPACITY` - Not enough spots for group size
- `HOLD_EXPIRED` - 15-minute hold timer expired
- `INVALID_HOLD_STATUS` - Hold already converted or cancelled
- `PAYMENT_METHOD_NOT_FOUND` - Saved payment method doesn't exist
- `PAYMENT_CARD_DECLINED` - Card was declined by bank
- `PAYMENT_PROCESSING_FAILED` - Payment processing error

---

## Important Implementation Notes

### Idempotency Keys
- **Required for:** `/v1/reservations/hold` and `/v1/reservations/hold/convert`
- **Format:** Use UUID v4 or similar unique identifier
- **Reuse behavior:** Same key returns cached response without reprocessing
- **Recommendation:** Generate new key for each user action, store for retries

### Hold Timer Management
- **Duration:** 15 minutes from creation
- **Frontend responsibility:** Show countdown timer to user
- **Expiry handling:** Redirect to start if hold expires
- **Auto-cleanup:** Backend automatically releases expired holds

### Payment Recovery Flow
If payment fails after hold conversion:
1. Hold remains in "pending" status
2. Payment can be retried with same `holdId`
3. System will create new payment intent if previous one expired
4. Original hold timer still applies

### Webhook Events (Backend Handles)
Your backend automatically processes these Stripe webhooks:
- `payment_intent.succeeded` - Updates reservation to confirmed
- `payment_intent.payment_failed` - Marks payment as failed
- `charge.refunded` - Records refund details

---

## Testing

### Test Scenarios
1. **Happy Path:** Hold → Convert → Payment Success → Confirmed
2. **Expired Hold:** Wait 15+ minutes → Try to convert → Get error
3. **Payment Retry:** Payment fails → Retry with same hold → Success
4. **Duplicate Request:** Same idempotency key → Get cached response
5. **3D Secure:** Use test card `4000002500003155` → Complete auth → Success

### Stripe Test Cards
- Success: `4242424242424242`
- 3D Secure Required: `4000002500003155`
- Declined: `4000000000000002`
- Insufficient Funds: `4000000000009995`

---

## Flow Diagram

```
User Selects Experience
        ↓
[1] POST /v1/reservations/hold
    (Creates 15-min hold)
        ↓
[2] GET /v1/payments/methods (optional)
    (Fetch saved cards)
        ↓
[3] POST /v1/reservations/hold/convert
    (Initialize payment)
        ↓
[4] Frontend: Stripe.confirmPayment()
    (Collect card & confirm)
        ↓
[5] GET /v1/reservations/{id}/payment-status
    (Check if successful)
        ↓
    Booking Complete
```

---

## Quick Integration Checklist

- [ ] Set up Cognito authentication
- [ ] Initialize Stripe.js on frontend
- [ ] Implement idempotency key generation
- [ ] Add hold countdown timer UI
- [ ] Handle hold expiry gracefully
- [ ] Implement payment retry logic
- [ ] Add error handling for all error codes
- [ ] Test with Stripe test cards
- [ ] Verify webhook endpoint is configured
- [ ] Add payment status polling for 3D Secure