# Payment API Documentation

This document provides comprehensive documentation for all payment-related endpoints in the Ohana marketplace API. All endpoints require authentication unless specified otherwise.

## Table of Contents
- [Payment Methods Management](#payment-methods-management)
- [Reservation Payment Flow](#reservation-payment-flow)
- [Stripe Webhooks](#stripe-webhooks)
- [Error Handling](#error-handling)
- [Integration Guide](#integration-guide)

## Payment Methods Management

### Get User Payment Methods
Retrieve all saved payment methods for the authenticated user.

**Endpoint:** `GET /v1/payments/methods`  
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "expMonth": 12,
      "expYear": 2025,
      "nickname": "Personal Card",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Add Payment Method
Add a new payment method to the user's account. The payment method must first be created using Stripe.js on the frontend.

**Endpoint:** `POST /v1/payments/methods`  
**Authentication:** Required

**Request Body:**
```json
{
  "paymentMethodId": "pm_1234567890abcdef",
  "nickname": "Business Card" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pm_1234567890abcdef",
    "type": "card",
    "last4": "4242",
    "brand": "visa",
    "expMonth": 12,
    "expYear": 2025,
    "nickname": "Business Card",
    "isDefault": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Delete Payment Method
Remove a payment method from the user's account.

**Endpoint:** `DELETE /v1/payments/methods/{paymentMethodId}`  
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Payment method removed successfully"
}
```

### Set Default Payment Method
Set a payment method as the default for the user.

**Endpoint:** `PUT /v1/payments/methods/{paymentMethodId}/default`  
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Default payment method updated successfully"
}
```

## Reservation Payment Flow

### 1. Create Hold
Create a temporary hold on a time slot while the user completes payment.

**Endpoint:** `POST /v1/reservations/hold`  
**Authentication:** Required  
**Headers:**
- `x-idempotency-key`: Required for safe retries

**Request Body:**
```json
{
  "experienceId": "550e8400-e29b-41d4-a716-446655440000",
  "timeSlotId": "660e8400-e29b-41d4-a716-446655440000",
  "numberOfGuests": 2,
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890", // Optional
  "specialRequests": "Vegetarian meal required" // Optional
}
```

**Response:**
```json
{
  "reservation": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "held",
    "experienceId": "550e8400-e29b-41d4-a716-446655440000",
    "timeSlotId": "660e8400-e29b-41d4-a716-446655440000",
    "numberOfGuests": 2,
    "totalAmount": 15000, // Amount in cents
    "holdExpiresAt": "2024-01-15T10:45:00Z"
  },
  "appliedDiscounts": {
    "groupDiscount": 1000,
    "earlyBirdDiscount": 500,
    "totalDiscount": 1500
  },
  "holdDurationMinutes": 15
}
```

### 2. Convert Hold to Reservation
Convert the hold to a confirmed reservation by processing payment.

**Endpoint:** `POST /v1/reservations/hold/convert`  
**Authentication:** Required

**Request Body:**
```json
{
  "holdId": "770e8400-e29b-41d4-a716-446655440000",
  "paymentIntentId": "pi_1234567890abcdef", // Optional - if payment was already initiated
  "paymentMethodId": "pm_1234567890abcdef", // Optional - if using saved payment method
  "savePaymentMethod": true // Optional - save payment method for future use
}
```

**Response (New Payment):**
```json
{
  "reservation": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "paymentIntentId": "pi_1234567890abcdef",
    "experienceId": "550e8400-e29b-41d4-a716-446655440000",
    "timeSlotId": "660e8400-e29b-41d4-a716-446655440000",
    "numberOfGuests": 2,
    "totalAmount": 15000
  },
  "paymentClientSecret": "pi_1234567890abcdef_secret_abcdef123456",
  "recovered": false
}
```

**Response (Duplicate Request):**
```json
{
  "reservation": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "paymentIntentId": "pi_1234567890abcdef"
  },
  "paymentStatus": "requires_payment_method",
  "requiresAction": true,
  "duplicate": true
}
```

### 3. Confirm Reservation
Confirm the reservation after successful payment processing.

**Endpoint:** `POST /v1/reservations/confirm`  
**Authentication:** Required

**Request Body:**
```json
{
  "reservationId": "770e8400-e29b-41d4-a716-446655440000",
  "paymentIntentId": "pi_1234567890abcdef"
}
```

**Response:**
```json
{
  "success": true,
  "reservation": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "confirmed",
    "confirmationCode": "ABC123",
    "paymentIntentId": "pi_1234567890abcdef"
  }
}
```

### 4. Get Payment Status
Check the current payment status of a reservation.

**Endpoint:** `GET /v1/reservations/{reservationId}/payment-status`  
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "reservationStatus": "pending",
    "paymentIntentId": "pi_1234567890abcdef",
    "paymentStatus": "pending",
    "stripeStatus": "requires_payment_method",
    "requiresAction": true,
    "actionType": "add_payment_method"
  }
}
```

**Action Types:**
- `add_payment_method`: User needs to provide payment details
- `confirm_payment`: Payment needs confirmation
- `authenticate_payment`: 3D Secure or other authentication required
- `null`: No action required

### 5. Get Reservation History
Retrieve the complete event history for a reservation.

**Endpoint:** `GET /v1/reservations/{reservationId}/history`  
**Authentication:** Required

**Response:**
```json
{
  "events": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "reservationId": "770e8400-e29b-41d4-a716-446655440000",
      "eventType": "reservation_created",
      "eventData": {
        "status": "held"
      },
      "metadata": {
        "userId": "user_123",
        "source": "api"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "eventType": "hold_converted",
      "eventData": {
        "previousStatus": "held",
        "newStatus": "pending"
      },
      "createdAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

## Stripe Webhooks

The API handles Stripe webhooks for asynchronous payment events. These are server-to-server endpoints and not called directly by the frontend.

### Identity Verification Webhook
**Endpoint:** `POST /v1/webhooks/stripe/identity`  
**Authentication:** Stripe signature verification

Handles identity verification events for host onboarding.

### Payment Events Webhook
**Endpoint:** `POST /v1/webhooks/stripe/payment`  
**Authentication:** Stripe signature verification

Handles payment-related events including:
- Payment intent succeeded
- Payment intent failed
- Payment method attached
- Charge succeeded/failed

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Common Error Codes

#### Payment Method Errors
- `PAYMENT_METHOD_NOT_FOUND`: Payment method doesn't exist
- `PAYMENT_METHOD_DECLINED`: Card was declined
- `INSUFFICIENT_FUNDS`: Insufficient funds

#### Reservation Errors
- `RESERVATION_NOT_FOUND`: Reservation doesn't exist
- `INVALID_HOLD_STATUS`: Hold is in invalid state for operation
- `HOLD_EXPIRED`: Hold has expired (after 15 minutes)
- `TIME_SLOT_NOT_AVAILABLE`: Time slot is no longer available
- `NOT_ENOUGH_CAPACITY`: Not enough capacity for requested guests

#### General Errors
- `USER_NOT_FOUND`: User doesn't exist
- `UNAUTHORIZED`: Invalid or missing authentication
- `VALIDATION_ERROR`: Request validation failed

## Integration Guide

### Frontend Payment Flow

1. **Create Payment Method with Stripe.js**
```javascript
// Create payment method using Stripe Elements
const { paymentMethod, error } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
  billing_details: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});
```

2. **Create Hold**
```javascript
const holdResponse = await fetch('/v1/reservations/hold', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-idempotency-key': generateIdempotencyKey(),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    experienceId,
    timeSlotId,
    numberOfGuests,
    guestName,
    guestEmail
  })
});
```

3. **Convert Hold with Payment**
```javascript
const convertResponse = await fetch('/v1/reservations/hold/convert', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    holdId: hold.id,
    paymentMethodId: paymentMethod.id,
    savePaymentMethod: true
  })
});

const { paymentClientSecret } = await convertResponse.json();
```

4. **Confirm Payment with Stripe**
```javascript
const { error } = await stripe.confirmCardPayment(paymentClientSecret);

if (!error) {
  // Payment successful, confirm reservation
  await fetch('/v1/reservations/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reservationId: reservation.id,
      paymentIntentId: reservation.paymentIntentId
    })
  });
}
```

### Handling 3D Secure Authentication

When a payment requires additional authentication:

```javascript
if (paymentIntent.status === 'requires_action') {
  const { error } = await stripe.confirmCardPayment(paymentClientSecret);
  
  if (!error) {
    // Authentication successful, payment will be processed
    // Check payment status or wait for webhook
  }
}
```

### Idempotency

Use idempotency keys for safe retries on network failures:

```javascript
function generateIdempotencyKey() {
  return `${userId}_${experienceId}_${Date.now()}_${Math.random()}`;
}
```

### Monitoring Payment Status

Poll the payment status endpoint while showing a loading state:

```javascript
async function waitForPaymentConfirmation(reservationId) {
  const maxAttempts = 30;
  const delayMs = 2000;
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/v1/reservations/${reservationId}/payment-status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const { data } = await response.json();
    
    if (data.reservationStatus === 'confirmed') {
      return true;
    }
    
    if (data.requiresAction) {
      // Handle required action based on actionType
      handlePaymentAction(data.actionType);
      return false;
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  return false;
}
```

## Best Practices

1. **Always use HTTPS** for all API calls
2. **Store payment method IDs**, never store card details
3. **Implement proper error handling** for all payment scenarios
4. **Use idempotency keys** for payment operations
5. **Show clear error messages** to users for payment failures
6. **Implement timeouts** for payment status polling
7. **Handle expired holds gracefully** with retry options
8. **Test with Stripe test cards** before going live

## Testing

Use Stripe test cards for development:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0027 6000 3184`
- Declined: `4000 0000 0000 0002`

Test webhooks using Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/v1/webhooks/stripe/payment
```