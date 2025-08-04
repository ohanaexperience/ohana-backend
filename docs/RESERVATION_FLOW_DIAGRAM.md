# Reservation Flow Diagram

## Complete Reservation Flow with Payment Methods

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Stripe
    participant DB as Database

    Note over U,DB: 1. Create Reservation Hold
    U->>F: Select experience & time slot
    F->>B: POST /v1/reservations/hold
    B->>DB: Lock time slot (SELECT FOR UPDATE)
    B->>DB: Create hold record
    B-->>F: Return hold details (15 min expiry)
    F-->>U: Show checkout page

    Note over U,DB: 2. Payment Method Selection
    F->>B: GET /v1/payments/methods
    B->>DB: Fetch user's saved cards
    B-->>F: Return payment methods
    F-->>U: Show payment options

    alt Use Saved Payment Method
        U->>F: Select saved card
        F->>B: POST /v1/reservations/convert-hold
        Note right of F: {holdId, paymentMethodId}
        B->>S: Create PaymentIntent with saved PM
        B->>DB: Update reservation status
        B-->>F: Return reservation details
        F-->>U: Show confirmation
    else Use New Card (Save for Future)
        U->>F: Enter new card + check "Save"
        F->>S: stripe.createPaymentMethod()
        S-->>F: Return paymentMethod
        F->>B: POST /v1/payments/methods
        Note right of F: Save payment method
        B->>DB: Store payment method reference
        B-->>F: Payment method saved
        F->>B: POST /v1/reservations/convert-hold
        Note right of F: {holdId, paymentMethodId}
        B->>S: Create PaymentIntent
        B-->>F: Return client secret
        F->>S: stripe.confirmCardPayment()
        S-->>F: Payment confirmed
        F->>B: POST /v1/reservations/confirm
        B-->>F: Reservation confirmed
    else Use New Card (One-time)
        U->>F: Enter new card
        F->>B: POST /v1/reservations/convert-hold
        Note right of F: {holdId}
        B->>S: Create PaymentIntent
        B-->>F: Return client secret
        F->>S: stripe.confirmCardPayment()
        S-->>F: Payment confirmed
        F->>B: POST /v1/reservations/confirm
        B-->>F: Reservation confirmed
    end

    Note over B,S: 3. Webhook Processing
    S->>B: Webhook: payment_intent.succeeded
    B->>DB: Check if event already processed
    alt New Event
        B->>DB: Update payment status
        B->>DB: Record webhook event
        B->>DB: Update reservation to confirmed
    else Duplicate Event
        B->>DB: Skip processing
    end
```

## Hold Expiration Flow

```mermaid
sequenceDiagram
    participant CJ as Cleanup Job
    participant DB as Database
    participant S as Stripe

    Note over CJ,S: Runs every 5 minutes
    CJ->>DB: Find expired holds
    loop For each expired hold
        CJ->>DB: Update status to 'cancelled'
        CJ->>DB: Release time slot capacity
        CJ->>DB: Log expiration event
        alt Has payment intent
            CJ->>S: Cancel payment intent
        end
    end
    CJ->>DB: Find orphaned payments
    loop For each orphaned payment
        CJ->>S: Cancel payment intent
        CJ->>DB: Update reservation status
    end
```

## Payment Method Management Flow

```mermaid
stateDiagram-v2
    [*] --> NoPaymentMethods
    NoPaymentMethods --> AddFirstCard: Add Payment Method
    AddFirstCard --> HasDefaultCard: Set as Default
    HasDefaultCard --> HasMultipleCards: Add Another Card
    HasMultipleCards --> HasDefaultCard: Remove Non-Default
    HasMultipleCards --> HasMultipleCards: Change Default
    HasMultipleCards --> NoPaymentMethods: Remove All Cards
    HasDefaultCard --> NoPaymentMethods: Remove Last Card
```

## Error Handling States

```mermaid
flowchart TD
    A[Start Checkout] --> B{Create Hold}
    B -->|Success| C[Select Payment Method]
    B -->|No Capacity| D[Show Alternative Times]
    
    C --> E{Hold Expired?}
    E -->|Yes| F[Show Expiration Message]
    E -->|No| G{Process Payment}
    
    F --> A
    
    G -->|Success| H[Reservation Confirmed]
    G -->|Card Declined| I[Show Payment Error]
    G -->|Network Error| J[Retry with Idempotency]
    
    I --> C
    J --> G
    
    H --> K[Show Confirmation]
    D --> A
```

## Implementation Timeline

```mermaid
gantt
    title Frontend Implementation Plan
    dateFormat  YYYY-MM-DD
    section Payment Methods
    Stripe Elements Setup    :2024-01-15, 2d
    Payment Method UI        :2024-01-17, 3d
    Add/Remove Methods       :2024-01-20, 2d
    section Checkout Flow
    Update Hold Conversion   :2024-01-22, 2d
    Payment Selection        :2024-01-24, 2d
    Error Handling           :2024-01-26, 1d
    section Testing
    Integration Testing      :2024-01-27, 2d
    User Acceptance Testing  :2024-01-29, 2d
```

## Key Implementation Points

1. **Idempotency**: Always use unique keys for hold creation
2. **Hold Timer**: Display countdown (15 minutes)
3. **Optimistic UI**: Update UI before server confirmation
4. **Error Recovery**: Handle expired holds gracefully
5. **Webhook Backup**: Don't rely solely on frontend confirmation

## State Management Example

```javascript
// Redux/Zustand store structure
const reservationStore = {
  hold: {
    id: 'hold_123',
    expiresAt: '2024-01-15T10:45:00Z',
    experienceId: 'exp_456',
    timeSlotId: 'slot_789',
    totalPrice: 200
  },
  paymentMethods: [
    {
      id: 'pm_method_123',
      last4: '4242',
      brand: 'visa',
      isDefault: true
    }
  ],
  checkout: {
    selectedPaymentMethod: 'pm_method_123',
    saveNewCard: false,
    processing: false,
    error: null
  }
}
```