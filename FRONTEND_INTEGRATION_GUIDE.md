# Frontend Integration Guide - Reservations & Payments

## Overview
This guide explains how to integrate the reservation and payment system from a frontend application. The system supports two flows: direct reservation and hold-based reservation.

## Authentication Setup

First, ensure users are authenticated via AWS Cognito:

```javascript
// Example with AWS Amplify
import { Auth } from 'aws-amplify';

const user = await Auth.currentAuthenticatedUser();
const token = user.signInUserSession.idToken.jwtToken;

// Include in all API requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## Flow 1: Direct Reservation (Single Step)

### 1. Create Reservation with Payment

```javascript
// Generate unique idempotency key
const idempotencyKey = `reservation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const reservationData = {
  experienceId: "uuid-here",
  timeSlotId: "uuid-here", 
  numberOfGuests: 2,
  guestName: "John Doe",
  guestEmail: "john@example.com",
  guestPhone: "+1234567890",
  specialRequests: "Vegetarian meal required",
  idempotencyKey: idempotencyKey
};

// POST /v1/reservations
const response = await fetch(`${API_BASE_URL}/v1/reservations`, {
  method: 'POST',
  headers,
  body: JSON.stringify(reservationData)
});

const result = await response.json();
```

Response:
```json
{
  "reservation": {
    "id": "reservation-uuid",
    "status": "pending",
    "totalPrice": 200,
    "originalPrice": 250,
    "discountApplied": 50,
    "discountType": "early_bird",
    "paymentClientSecret": "pi_xxx_secret_xxx"
  },
  "appliedDiscounts": {
    "groupDiscount": { "amount": 0, "type": null },
    "earlyBirdDiscount": { "amount": 50, "type": "early_bird" },
    "totalDiscount": 50
  }
}
```

### 2. Process Payment with Stripe

```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Use Stripe Elements or Payment Element
const { error } = await stripe.confirmPayment({
  clientSecret: result.reservation.paymentClientSecret,
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/booking-success`,
  },
});

if (error) {
  // Handle payment error
  console.error('Payment failed:', error);
}
```

### 3. Confirm Reservation (After Payment)

```javascript
// POST /v1/reservations/{id}/confirm
const confirmResponse = await fetch(
  `${API_BASE_URL}/v1/reservations/${reservationId}/confirm`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      paymentIntentId: paymentIntent.id
    })
  }
);

const confirmation = await confirmResponse.json();
```

## Flow 2: Hold-Based Reservation (Two Steps)

Better for complex checkouts or when users need time to review:

### 1. Create Hold (Locks Inventory)

```javascript
const holdData = {
  experienceId: "uuid-here",
  timeSlotId: "uuid-here",
  numberOfGuests: 2,
  guestName: "John Doe",
  guestEmail: "john@example.com",
  guestPhone: "+1234567890",
  specialRequests: "Window seat preferred"
};

// POST /v1/reservations/hold
const holdResponse = await fetch(`${API_BASE_URL}/v1/reservations/hold`, {
  method: 'POST',
  headers: {
    ...headers,
    'X-Idempotency-Key': idempotencyKey
  },
  body: JSON.stringify(holdData)
});

const hold = await holdResponse.json();
```

Response:
```json
{
  "reservation": {
    "id": "hold-uuid",
    "status": "held",
    "holdExpiresAt": "2024-01-01T12:15:00Z",
    "totalPrice": 200
  },
  "holdDurationMinutes": 15,
  "appliedDiscounts": {
    "totalDiscount": 50
  }
}
```

### 2. Show Hold Timer

```javascript
// Display countdown timer
const CountdownTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = new Date(expiresAt) - new Date();
      if (remaining <= 0) {
        clearInterval(timer);
        // Handle expiration
        alert('Your hold has expired. Please start over.');
        navigate('/experiences');
      }
      setTimeLeft(Math.floor(remaining / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresAt]);
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <div className="hold-timer">
      <p>Hold expires in: {minutes}:{seconds.toString().padStart(2, '0')}</p>
    </div>
  );
};
```

### 3. Convert Hold to Reservation

```javascript
// POST /v1/reservations/hold/{holdId}/convert
try {
  const convertResponse = await fetch(
    `${API_BASE_URL}/v1/reservations/hold/${holdId}/convert`,
    {
      method: 'POST',
      headers
    }
  );

  if (!convertResponse.ok) {
    const error = await convertResponse.json();
    
    switch (error.error) {
      case 'HOLD_EXPIRED':
        // Hold expired - create a new hold
        alert('Your hold expired. Please start over.');
        // Redirect to experience page or create new hold
        break;
        
      case 'RESERVATION_NOT_FOUND':
        // Hold doesn't exist
        alert('Reservation not found. Please start over.');
        break;
        
      default:
        throw new Error(error.message || 'Failed to convert hold');
    }
    return;
  }

  const result = await convertResponse.json();
  
  // Check if this is a duplicate conversion
  if (result.duplicate) {
    // Hold was already converted - proceed with existing payment if needed
    if (result.reservation.status === 'confirmed') {
      // Already paid, redirect to success
      navigate('/booking-success');
      return;
    }
  }
  
  // Check if payment setup failed
  if (result.paymentError) {
    console.error('Payment setup failed:', result.paymentError);
    
    if (result.paymentError.canRetry) {
      // The hold was converted but payment failed
      // You can retry by calling convert again - it will detect the pending state
      // and only create the payment intent
      const retryButton = confirm('Payment setup failed. Would you like to retry?');
      if (retryButton) {
        // Simply retry the same convert call
        return await convertHold(holdId);
      }
    }
    return;
  }
  
  // Continue with payment using result.paymentClientSecret
  if (!result.paymentClientSecret) {
    throw new Error('No payment client secret received');
  }
  
} catch (error) {
  console.error('Failed to convert hold:', error);
  alert('An error occurred. Please try again.');
}
```

### 4. Complete Payment
Same as Flow 1, step 2

## Error Handling

```javascript
class ReservationService {
  async createReservation(data) {
    try {
      const response = await fetch('/v1/reservations', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        switch (error.error) {
          case 'TIME_SLOT_NOT_AVAILABLE':
            throw new Error('This time slot is no longer available');
          
          case 'TIME_SLOT_NOT_ENOUGH_CAPACITY':
            throw new Error('Not enough spots available for your group');
          
          case 'PAYMENT_CARD_DECLINED':
            throw new Error('Your card was declined');
            
          default:
            throw new Error(error.message || 'Booking failed');
        }
      }
      
      return await response.json();
      
    } catch (error) {
      // Handle network errors
      console.error('Reservation failed:', error);
      throw error;
    }
  }
}
```

## Idempotency Best Practices

The backend handles idempotency intelligently:
- **Valid holds/reservations**: Returns the existing one
- **Expired holds**: Automatically creates a new hold
- **Failed/cancelled reservations**: Creates a new reservation

```javascript
// Generate a unique idempotency key for each booking attempt
const generateIdempotencyKey = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// For better UX, you can store the key temporarily
const bookingAttempt = {
  idempotencyKey: generateIdempotencyKey(),
  experienceId: experience.id,
  timeSlotId: timeSlot.id,
  timestamp: Date.now()
};

// The backend will handle:
// 1. Returning existing valid holds/reservations
// 2. Creating new ones if the old ones expired or failed
// 3. Preventing duplicate charges
```

### Backend Idempotency Behavior

When you send a request with an idempotency key:

1. **For Holds**:
   - If a valid hold exists → Returns it
   - If an expired hold exists → Creates a new hold
   - If no hold exists → Creates a new hold

2. **For Reservations**:
   - If a successful reservation exists → Returns it
   - If a failed/cancelled reservation exists → Creates a new one
   - If no reservation exists → Creates a new one

This means the frontend doesn't need to worry about expired holds or failed payments - just send the request and the backend handles it correctly.

## Complete React Example

```jsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function BookingForm({ experience, timeSlot }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [reservation, setReservation] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Step 1: Create reservation
      const formData = new FormData(e.target);
      const reservationData = {
        experienceId: experience.id,
        timeSlotId: timeSlot.id,
        numberOfGuests: parseInt(formData.get('guests')),
        guestName: formData.get('name'),
        guestEmail: formData.get('email'),
        guestPhone: formData.get('phone'),
        specialRequests: formData.get('requests'),
        idempotencyKey: generateIdempotencyKey()
      };
      
      const res = await createReservation(reservationData);
      setReservation(res.reservation);
      
      // Step 2: Confirm payment
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret: res.reservation.paymentClientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/booking/success`,
        },
      });
      
      if (error) {
        throw error;
      }
      
    } catch (error) {
      console.error('Booking failed:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Your Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="phone" type="tel" placeholder="Phone" />
      <select name="guests" required>
        <option value="1">1 Guest</option>
        <option value="2">2 Guests</option>
        <option value="3">3 Guests</option>
        <option value="4">4 Guests</option>
      </select>
      <textarea name="requests" placeholder="Special requests" />
      
      {reservation && (
        <Elements stripe={stripePromise} options={{ clientSecret: reservation.paymentClientSecret }}>
          <PaymentElement />
        </Elements>
      )}
      
      <button type="submit" disabled={loading || !stripe}>
        {loading ? 'Processing...' : 'Book Now'}
      </button>
    </form>
  );
}
```

## Webhook Events (Optional Frontend Handling)

For real-time updates via WebSocket or polling:

```javascript
// Listen for reservation status updates
const subscribeToReservation = (reservationId) => {
  const eventSource = new EventSource(
    `${API_BASE_URL}/v1/reservations/${reservationId}/events`
  );
  
  eventSource.addEventListener('status-update', (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.status) {
      case 'confirmed':
        // Show success message
        showSuccessModal(data);
        break;
        
      case 'failed':
        // Show error and allow retry
        showErrorModal(data.error);
        break;
        
      case 'cancelled':
        // Handle cancellation
        redirectToExperiences();
        break;
    }
  });
  
  return () => eventSource.close();
};
```

## Testing in Development

```javascript
// Use Stripe test cards
const TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficientFunds: '4000000000009995',
  threeDSecure: '4000002500003155'
};

// Add to your test environment
if (process.env.NODE_ENV === 'development') {
  window.testReservation = async () => {
    const data = {
      experienceId: 'test-experience-id',
      timeSlotId: 'test-slot-id',
      numberOfGuests: 2,
      guestName: 'Test User',
      guestEmail: 'test@example.com',
      idempotencyKey: `test_${Date.now()}`
    };
    
    return await createReservation(data);
  };
}
```

## Mobile App Integration

For React Native:

```javascript
import { StripeProvider, usePaymentSheet } from '@stripe/stripe-react-native';

function BookingScreen() {
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  
  const handleBooking = async () => {
    // Create reservation
    const reservation = await createReservation(data);
    
    // Initialize payment sheet
    await initPaymentSheet({
      paymentIntentClientSecret: reservation.paymentClientSecret,
      merchantDisplayName: 'Your Marketplace',
    });
    
    // Present payment sheet
    const { error } = await presentPaymentSheet();
    
    if (!error) {
      // Confirm reservation
      await confirmReservation(reservation.id);
    }
  };
}
```

## Common Integration Patterns

### 1. Availability Check Before Booking
```javascript
// GET /v1/time-slots/{id}
const checkAvailability = async (timeSlotId, guests) => {
  const response = await fetch(
    `${API_BASE_URL}/v1/time-slots/${timeSlotId}?guests=${guests}`
  );
  const slot = await response.json();
  
  return slot.availableCapacity >= guests;
};
```

### 2. Price Preview
```javascript
const calculatePrice = (experience, guests, timeSlot) => {
  const basePrice = experience.pricePerPerson * guests;
  let discount = 0;
  
  // Group discount
  if (experience.groupDiscountsEnabled) {
    if (guests >= 5 && experience.discountPercentageFor5Plus) {
      discount = basePrice * (experience.discountPercentageFor5Plus / 100);
    } else if (guests >= 3 && experience.discountPercentageFor3Plus) {
      discount = basePrice * (experience.discountPercentageFor3Plus / 100);
    }
  }
  
  // Early bird discount
  if (experience.earlyBirdEnabled) {
    const daysUntil = dayjs(timeSlot.slotDateTime).diff(dayjs(), 'day');
    if (daysUntil >= experience.earlyBirdDaysInAdvance) {
      discount += basePrice * (experience.earlyBirdDiscountPercentage / 100);
    }
  }
  
  return {
    original: basePrice,
    discount: discount,
    total: basePrice - discount
  };
};
```

### 3. Retry Failed Payments
```javascript
const retryPayment = async (reservationId) => {
  // Get new payment intent
  const response = await fetch(
    `${API_BASE_URL}/v1/reservations/${reservationId}/retry-payment`,
    { method: 'POST', headers }
  );
  
  const { clientSecret } = await response.json();
  
  // Process with Stripe
  return await stripe.confirmPayment({
    clientSecret,
    elements
  });
};
```