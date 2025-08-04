# Payment Methods API Guide for Frontend Developers

This guide covers the payment methods and improved reservation flow APIs that have been implemented to follow industry best practices.

## Table of Contents
- [Authentication](#authentication)
- [Payment Methods Management](#payment-methods-management)
- [Reservation Flow with Payment Methods](#reservation-flow-with-payment-methods)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Authentication

All endpoints require authentication via Cognito JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

## Payment Methods Management

### 1. List User's Payment Methods

**Endpoint:** `GET /v1/payments/methods`

**Description:** Retrieves all saved payment methods for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_method_123",
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "expMonth": "12",
      "expYear": "2025",
      "nickname": "Personal Card",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Frontend Example:**
```javascript
async function getUserPaymentMethods() {
  const response = await fetch('/v1/payments/methods', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.data;
}
```

### 2. Add a Payment Method

**Endpoint:** `POST /v1/payments/methods`

**Description:** Adds a new payment method to the user's account. You'll need to collect payment details using Stripe Elements on the frontend first.

**Request Body:**
```json
{
  "paymentMethodId": "pm_1234567890", // From Stripe Elements
  "nickname": "Work Card" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pm_method_456",
    "type": "card",
    "last4": "5555",
    "brand": "mastercard",
    "expMonth": "06",
    "expYear": "2026",
    "nickname": "Work Card",
    "isDefault": false,
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

**Frontend Example with Stripe Elements:**
```javascript
// First, create payment method with Stripe
const { error, paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement, // Your Stripe Elements card
});

if (!error) {
  // Then save it to your backend
  const response = await fetch('/v1/payments/methods', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paymentMethodId: paymentMethod.id,
      nickname: 'Personal Card'
    })
  });
  
  const data = await response.json();
  console.log('Payment method saved:', data.data);
}
```

### 3. Remove a Payment Method

**Endpoint:** `DELETE /v1/payments/methods/{paymentMethodId}`

**Description:** Removes a saved payment method from the user's account.

**Response:**
```json
{
  "success": true,
  "message": "Payment method removed successfully"
}
```

**Frontend Example:**
```javascript
async function removePaymentMethod(methodId) {
  const response = await fetch(`/v1/payments/methods/${methodId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    // Refresh payment methods list
    await getUserPaymentMethods();
  }
}
```

### 4. Set Default Payment Method

**Endpoint:** `PUT /v1/payments/methods/{paymentMethodId}/default`

**Description:** Sets a payment method as the default for future transactions.

**Response:**
```json
{
  "success": true,
  "message": "Default payment method updated successfully"
}
```

**Frontend Example:**
```javascript
async function setDefaultPaymentMethod(methodId) {
  const response = await fetch(`/v1/payments/methods/${methodId}/default`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    // Update UI to reflect new default
    await getUserPaymentMethods();
  }
}
```

## Reservation Flow with Payment Methods

### Complete Reservation Flow

1. **Create a Hold** (existing endpoint)
2. **Convert Hold to Reservation** with payment options

### Convert Hold to Reservation with Payment Options

**Endpoint:** `POST /v1/reservations/convert-hold`

**Description:** Converts a hold to a confirmed reservation with various payment options.

**Request Body Options:**

#### Option 1: Use a Saved Payment Method
```json
{
  "holdId": "hold_123",
  "paymentMethodId": "pm_method_456"
}
```

#### Option 2: Use New Card and Save for Future
```json
{
  "holdId": "hold_123",
  "savePaymentMethod": true
  // Payment intent will be created, return client secret for Stripe confirmation
}
```

#### Option 3: One-time Payment (existing flow)
```json
{
  "holdId": "hold_123"
  // Payment intent will be created without saving
}
```

**Response:**
```json
{
  "reservation": {
    "id": "res_123",
    "status": "pending",
    "experienceId": "exp_456",
    "timeSlotId": "slot_789",
    "numberOfGuests": 2,
    "totalPrice": 200,
    "paymentIntentId": "pi_abc123"
  },
  "paymentClientSecret": "pi_abc123_secret_xyz" // Only for new payments
}
```

**Frontend Example - Using Saved Payment Method:**
```javascript
async function completeReservationWithSavedCard(holdId, paymentMethodId) {
  // Convert hold using saved payment method
  const response = await fetch('/v1/reservations/convert-hold', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      holdId,
      paymentMethodId
    })
  });
  
  const data = await response.json();
  
  if (data.reservation.status === 'pending') {
    // Payment was processed successfully
    // Redirect to confirmation page
    window.location.href = `/reservations/${data.reservation.id}/confirmation`;
  }
}
```

**Frontend Example - New Card with Save Option:**
```javascript
async function completeReservationWithNewCard(holdId, saveCard) {
  // Step 1: Convert hold and get payment intent
  const response = await fetch('/v1/reservations/convert-hold', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      holdId,
      savePaymentMethod: saveCard
    })
  });
  
  const data = await response.json();
  
  // Step 2: Confirm payment with Stripe
  const { error } = await stripe.confirmCardPayment(data.paymentClientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: userName,
        email: userEmail
      }
    }
  });
  
  if (!error) {
    // Step 3: Confirm reservation (existing endpoint)
    await confirmReservation(data.reservation.id);
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message"
}
```

Common error codes:
- `USER_NOT_FOUND` - User doesn't exist
- `PAYMENT_METHOD_NOT_FOUND` - Payment method not found
- `PAYMENT_PROCESSING_FAILED` - Payment processing failed
- `HOLD_EXPIRED` - Reservation hold has expired
- `HOLD_NOT_FOUND` - Hold doesn't exist
- `NOT_ENOUGH_CAPACITY` - Time slot is full

**Frontend Error Handling Example:**
```javascript
try {
  const response = await fetch('/v1/payments/methods', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    switch (error.error) {
      case 'PAYMENT_METHOD_NOT_FOUND':
        showError('This payment method no longer exists');
        break;
      case 'HOLD_EXPIRED':
        showError('Your reservation hold has expired. Please start over.');
        navigateTo('/experiences');
        break;
      default:
        showError(error.message || 'An error occurred');
    }
    return;
  }
  
  const data = await response.json();
  // Handle success
} catch (error) {
  showError('Network error. Please try again.');
}
```

## Best Practices

### 1. Idempotency

The reservation system uses idempotency keys to prevent duplicate charges. Always generate a unique idempotency key for each reservation attempt:

```javascript
function generateIdempotencyKey(userId, experienceId, timeSlotId) {
  const timestamp = Date.now();
  return `${userId}-${experienceId}-${timeSlotId}-${timestamp}`;
}
```

### 2. Hold Expiration

Holds expire after 15 minutes. Always check the hold status before attempting to convert:

```javascript
function isHoldExpired(hold) {
  const expiresAt = new Date(hold.holdExpiresAt);
  return new Date() > expiresAt;
}

// Show countdown timer to user
function getTimeRemaining(hold) {
  const expiresAt = new Date(hold.holdExpiresAt);
  const now = new Date();
  const remaining = expiresAt - now;
  
  if (remaining <= 0) return '0:00';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

### 3. Payment Method Selection UI

```javascript
// Example React component
function PaymentMethodSelector({ methods, onSelect }) {
  const [selectedMethod, setSelectedMethod] = useState(
    methods.find(m => m.isDefault)?.id || 'new'
  );
  
  return (
    <div>
      {methods.map(method => (
        <label key={method.id}>
          <input
            type="radio"
            value={method.id}
            checked={selectedMethod === method.id}
            onChange={(e) => setSelectedMethod(e.target.value)}
          />
          <span>
            {method.nickname || `${method.brand} ending in ${method.last4}`}
            {method.isDefault && ' (Default)'}
          </span>
        </label>
      ))}
      
      <label>
        <input
          type="radio"
          value="new"
          checked={selectedMethod === 'new'}
          onChange={(e) => setSelectedMethod(e.target.value)}
        />
        <span>Use a new card</span>
      </label>
      
      {selectedMethod === 'new' && (
        <label>
          <input type="checkbox" onChange={(e) => setSaveCard(e.target.checked)} />
          Save this card for future use
        </label>
      )}
      
      <button onClick={() => onSelect(selectedMethod, saveCard)}>
        Complete Reservation
      </button>
    </div>
  );
}
```

### 4. Webhook Integration

The system automatically handles payment confirmations via webhooks. You don't need to poll for status updates, but you should handle real-time updates if using WebSockets:

```javascript
// Listen for payment confirmation via WebSocket
socket.on('reservation.confirmed', (data) => {
  if (data.reservationId === currentReservation.id) {
    showSuccess('Payment confirmed!');
    navigateTo(`/reservations/${data.reservationId}/confirmation`);
  }
});
```

### 5. Security Considerations

- Never store or log full card numbers
- Always use HTTPS in production
- Use Stripe Elements to avoid PCI compliance issues
- Validate all inputs on both frontend and backend

## Testing

### Test Card Numbers

For development/staging environments:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Decline: `4000 0000 0000 9995`

### Example Test Flow

```javascript
// Complete reservation flow test
async function testReservationFlow() {
  // 1. Create hold
  const hold = await createHold(experienceId, timeSlotId, 2);
  console.log('Hold created:', hold.id);
  
  // 2. List payment methods
  const methods = await getUserPaymentMethods();
  console.log('Payment methods:', methods);
  
  // 3. Complete reservation
  if (methods.length > 0) {
    // Use saved method
    await completeReservationWithSavedCard(hold.id, methods[0].id);
  } else {
    // Use new card
    await completeReservationWithNewCard(hold.id, true);
  }
}
```

## Migration Guide

If you're updating from the old payment flow:

1. Update the hold conversion endpoint to use the new request format
2. Add payment method selection UI
3. Handle the `savePaymentMethod` option
4. Update error handling for new error codes
5. Add payment methods management section to user account

## Support

For questions or issues:
- Check the error response for specific error codes
- Review webhook logs for payment processing issues
- Contact backend team for API-specific questions