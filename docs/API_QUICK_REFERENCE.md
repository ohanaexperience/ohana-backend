# API Quick Reference - Payment Methods & Reservations

## Payment Methods Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/v1/payments/methods` | List user's saved payment methods | ✓ |
| POST | `/v1/payments/methods` | Add a new payment method | ✓ |
| DELETE | `/v1/payments/methods/{id}` | Remove a payment method | ✓ |
| PUT | `/v1/payments/methods/{id}/default` | Set default payment method | ✓ |

## Updated Reservation Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/v1/reservations/convert-hold` | Convert hold to reservation with payment options | ✓ |

## Request/Response Examples

### Add Payment Method
```bash
POST /v1/payments/methods
{
  "paymentMethodId": "pm_1234567890",
  "nickname": "Personal Card"
}
```

### Convert Hold with Saved Payment Method
```bash
POST /v1/reservations/convert-hold
{
  "holdId": "hold_123",
  "paymentMethodId": "pm_method_456"
}
```

### Convert Hold with New Card (Save for Future)
```bash
POST /v1/reservations/convert-hold
{
  "holdId": "hold_123",
  "savePaymentMethod": true
}
```

## Implementation Checklist

### Frontend Tasks
- [ ] Add Stripe Elements for card collection
- [ ] Create payment method management UI
- [ ] Update checkout flow with payment method selection
- [ ] Add "Save card for future use" checkbox
- [ ] Implement error handling for new error codes
- [ ] Add hold expiration countdown timer
- [ ] Update user account section with payment methods

### Required Stripe.js Functions
```javascript
// Create payment method
stripe.createPaymentMethod({
  type: 'card',
  card: cardElement
})

// Confirm payment (for new cards)
stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement
  }
})
```

### Environment Variables Needed
- `STRIPE_PUBLISHABLE_KEY` - For Stripe.js initialization

## Common Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `PAYMENT_METHOD_NOT_FOUND` | Payment method doesn't exist | Select a different payment method |
| `HOLD_EXPIRED` | Reservation hold expired | Start reservation process again |
| `NOT_ENOUGH_CAPACITY` | Time slot is full | Select a different time |
| `PAYMENT_PROCESSING_FAILED` | Payment failed | Try a different payment method |
| `USER_NOT_FOUND` | User not found | Re-authenticate |

## Testing Tips

1. Use Stripe test cards:
   - `4242 4242 4242 4242` - Success
   - `4000 0000 0000 9995` - Decline

2. Test hold expiration by waiting 15 minutes

3. Test idempotency by attempting duplicate reservations

4. Verify webhook processing in Stripe dashboard

## Security Notes

- Always use HTTPS in production
- Never log or store full card numbers
- Use Stripe Elements to maintain PCI compliance
- Validate all inputs on frontend and backend