# Best Practice Implementation Guide

## Overview

We've implemented industry best practices for handling payment sessions and expired payment intents. This guide explains the changes and how to integrate them in your frontend.

## Key Features

1. **Automatic Payment Recovery**: Expired or cancelled payment intents are automatically recovered
2. **Secure Session Management**: Client secrets are never re-exposed after initial creation
3. **Payment Status Endpoint**: Check payment status without exposing sensitive data
4. **Idempotent Recovery**: Safe retry mechanism with unique recovery keys

## API Changes

### 1. Enhanced Convert Hold Response

The `/v1/reservations/convert-hold` endpoint now returns additional information:

#### When Payment Recovery Occurs
```json
{
  "reservation": {
    "id": "res_123",
    "status": "pending",
    "paymentIntentId": "pi_new_456"  // New payment intent ID
  },
  "paymentClientSecret": "pi_new_456_secret_xyz",
  "recovered": true  // Indicates recovery happened
}
```

#### When Payment Already Exists (No Secret)
```json
{
  "reservation": {
    "id": "res_123",
    "status": "pending",
    "paymentIntentId": "pi_123"
  },
  "paymentStatus": "requires_confirmation",
  "requiresAction": true,
  "duplicate": true
}
```

### 2. New Payment Status Endpoint

**Endpoint:** `GET /v1/reservations/{reservationId}/payment-status`

**Response:**
```json
{
  "success": true,
  "data": {
    "reservationStatus": "pending",
    "paymentIntentId": "pi_123",
    "paymentStatus": "pending",
    "stripeStatus": "requires_confirmation",
    "requiresAction": true,
    "actionType": "confirm_payment"  // or "add_payment_method", "authenticate_payment"
  }
}
```

## Frontend Implementation

### Session Storage Strategy

```javascript
class PaymentSessionManager {
  constructor() {
    this.storageKey = 'payment_sessions';
  }

  saveClientSecret(holdId, clientSecret) {
    const sessions = this.getSessions();
    sessions[holdId] = {
      clientSecret,
      timestamp: Date.now()
    };
    sessionStorage.setItem(this.storageKey, JSON.stringify(sessions));
  }

  getClientSecret(holdId) {
    const sessions = this.getSessions();
    const session = sessions[holdId];
    
    if (!session) return null;
    
    // Check if session is older than 24 hours
    const age = Date.now() - session.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      this.removeSession(holdId);
      return null;
    }
    
    return session.clientSecret;
  }

  getSessions() {
    const stored = sessionStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }

  removeSession(holdId) {
    const sessions = this.getSessions();
    delete sessions[holdId];
    sessionStorage.setItem(this.storageKey, JSON.stringify(sessions));
  }

  clearAll() {
    sessionStorage.removeItem(this.storageKey);
  }
}
```

### Complete Checkout Flow

```javascript
const sessionManager = new PaymentSessionManager();

async function handleCheckout(holdId, paymentMethodId, saveCard) {
  try {
    // Step 1: Convert hold
    const response = await fetch('/v1/reservations/convert-hold', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        holdId,
        paymentMethodId,
        savePaymentMethod: saveCard
      })
    });

    const data = await response.json();

    // Step 2: Handle response based on scenario
    if (data.paymentClientSecret) {
      // New payment intent created (or recovered)
      sessionManager.saveClientSecret(holdId, data.paymentClientSecret);
      
      if (data.recovered) {
        console.log('Payment session recovered successfully');
      }
      
      // Confirm payment with Stripe
      await confirmPaymentWithStripe(data.paymentClientSecret);
      
    } else if (data.requiresAction && data.duplicate) {
      // Payment exists but needs action
      const storedSecret = sessionManager.getClientSecret(holdId);
      
      if (storedSecret) {
        // Use stored secret
        await confirmPaymentWithStripe(storedSecret);
      } else {
        // No stored secret, check payment status
        await handleMissingSecret(data.reservation.id);
      }
      
    } else if (data.paymentStatus === 'succeeded') {
      // Payment already succeeded
      navigateToConfirmation(data.reservation.id);
    }
    
  } catch (error) {
    handleError(error);
  }
}

async function handleMissingSecret(reservationId) {
  // Get payment status
  const response = await fetch(`/v1/reservations/${reservationId}/payment-status`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const status = await response.json();
  
  if (status.data.requiresAction) {
    switch (status.data.actionType) {
      case 'confirm_payment':
        // User needs to complete payment - show error
        showError('Your payment session has expired. Please start checkout again.');
        navigateToExperience();
        break;
        
      case 'authenticate_payment':
        // 3D Secure required
        show3DSecureMessage();
        break;
        
      case 'add_payment_method':
        // Payment method required
        showPaymentMethodForm();
        break;
    }
  } else if (status.data.stripeStatus === 'succeeded') {
    // Payment succeeded, just navigate
    navigateToConfirmation(reservationId);
  }
}

async function confirmPaymentWithStripe(clientSecret) {
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret);
  
  if (error) {
    if (error.code === 'payment_intent_authentication_failure') {
      // 3D Secure failed
      handle3DSecureFailure(error);
    } else {
      handlePaymentError(error);
    }
  } else {
    // Success - clean up session
    sessionManager.removeSession(holdId);
    navigateToConfirmation(paymentIntent.metadata.reservationId);
  }
}
```

### Error Recovery Component

```jsx
function PaymentRecovery({ reservation, onRetry }) {
  const [status, setStatus] = useState('checking');
  const [action, setAction] = useState(null);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  async function checkPaymentStatus() {
    try {
      const response = await fetch(
        `/v1/reservations/${reservation.id}/payment-status`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const data = await response.json();
      
      if (data.data.requiresAction) {
        setAction(data.data.actionType);
        setStatus('action_required');
      } else if (data.data.stripeStatus === 'succeeded') {
        setStatus('success');
        setTimeout(() => navigateToConfirmation(reservation.id), 1000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  }

  if (status === 'checking') {
    return <Spinner message="Checking payment status..." />;
  }

  if (status === 'success') {
    return <SuccessMessage message="Payment confirmed! Redirecting..." />;
  }

  if (status === 'action_required') {
    return (
      <div className="payment-recovery">
        <h3>Action Required</h3>
        {action === 'confirm_payment' && (
          <div>
            <p>Your payment session has expired. Please try again.</p>
            <button onClick={onRetry}>Start New Payment</button>
          </div>
        )}
        {action === 'authenticate_payment' && (
          <div>
            <p>Your bank requires additional authentication.</p>
            <button onClick={() => window.location.reload()}>
              Complete Authentication
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ErrorMessage 
      message="Unable to process payment" 
      onRetry={onRetry}
    />
  );
}
```

## Security Best Practices

1. **Never Store Client Secrets in LocalStorage**
   - Use sessionStorage only
   - Clear on logout
   - Implement expiration checks

2. **Handle Browser Refresh**
   ```javascript
   window.addEventListener('beforeunload', (event) => {
     if (hasActivePayment()) {
       event.preventDefault();
       event.returnValue = 'Payment in progress. Are you sure you want to leave?';
     }
   });
   ```

3. **Implement Timeout Warnings**
   ```javascript
   function PaymentTimer({ expiresAt, onExpired }) {
     const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(expiresAt));

     useEffect(() => {
       const timer = setInterval(() => {
         const left = calculateTimeLeft(expiresAt);
         setTimeLeft(left);
         
         if (left <= 0) {
           onExpired();
           clearInterval(timer);
         }
       }, 1000);

       return () => clearInterval(timer);
     }, [expiresAt]);

     if (timeLeft < 60) {
       return <WarningBanner>Payment expires in {timeLeft} seconds!</WarningBanner>;
     }

     return <div>Time remaining: {formatTime(timeLeft)}</div>;
   }
   ```

## Testing Scenarios

### 1. Normal Flow
- Create hold → Convert with payment → Success

### 2. Recovery Flow
- Create hold → Convert → Wait 24+ hours → Convert again → Should get new secret

### 3. Duplicate Request
- Create hold → Convert → Convert again immediately → Should not get secret

### 4. Browser Refresh
- Create hold → Convert → Refresh page → Use stored secret

### 5. Session Timeout
- Create hold → Convert → Clear session storage → Check payment status

## Monitoring

Log these events for monitoring:
- Payment recovery attempts
- Session storage failures
- Payment status check frequency
- Client secret exposure attempts

```javascript
// Analytics tracking
function trackPaymentEvent(event, data) {
  if (window.analytics) {
    window.analytics.track(event, {
      ...data,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId()
    });
  }
}

// Usage
trackPaymentEvent('payment_recovery_triggered', {
  reservationId: reservation.id,
  reason: 'expired'
});
```

## Migration Checklist

- [ ] Implement session storage manager
- [ ] Update checkout flow to handle recovery
- [ ] Add payment status checking
- [ ] Implement error recovery UI
- [ ] Add timeout warnings
- [ ] Test all scenarios
- [ ] Monitor recovery rates

## Support

Common issues and solutions:

1. **"Payment session expired"**
   - Session storage was cleared
   - Payment intent is older than 24 hours
   - Solution: Start checkout process again

2. **"Payment already processing"**
   - Duplicate request while payment is confirming
   - Solution: Check payment status endpoint

3. **"Recovery failed"**
   - Network issue during recovery
   - Solution: Retry with exponential backoff