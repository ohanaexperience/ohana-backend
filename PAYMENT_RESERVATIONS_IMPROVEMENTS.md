# Payment & Reservations System Improvements

## Overview
This document outlines recommended improvements for the payment and reservations system based on a comprehensive code review conducted on 2025-08-01. The current implementation follows many best practices but can be enhanced for better scalability, reliability, and fault tolerance.

## Recently Implemented (2025-08-01)

### ✅ Smart Idempotency for Expired Holds
**Issue**: Frontend was receiving expired holds when using same idempotency key, causing HOLD_EXPIRED errors.

**Solution Implemented**:
- Backend now checks if existing hold/reservation is expired or failed
- Automatically creates new hold/reservation if the old one is invalid
- Maintains true idempotency for valid holds/reservations

This eliminates the need for complex frontend logic to handle expired duplicates.

### ✅ Improved Payment Error Handling in Hold Conversion
**Issue**: Payment intent creation was inside database transaction, causing entire hold conversion to fail and rollback on Stripe errors.

**Solution Implemented**:
- Moved payment intent creation outside of database transaction
- Hold is successfully converted even if payment setup fails
- Returns graceful error response allowing frontend to retry payment
- Prevents inventory from being stuck in limbo

Benefits:
- Better separation of concerns (inventory vs payment)
- More resilient to transient payment provider failures
- Clearer error messages for frontend to handle
- Maintains reservation state for retry attempts

### ✅ Fixed Hold Conversion Retry Logic
**Issue**: After payment failure, retrying hold conversion would fail with INVALID_HOLD_STATUS because the hold was already converted to 'pending'.

**Solution Implemented**:
- Added logic to handle 'pending' status reservations without payment
- When converting a hold that's already 'pending', skip the status update
- Only create the payment intent on retry
- Frontend can simply retry the same convert call

Benefits:
- Simpler frontend retry logic
- No need for separate payment retry endpoints
- Handles edge cases gracefully
- Maintains idempotency while allowing retries

## Priority 1: Critical Improvements

### 1. Distributed Locking for High Concurrency
**Issue**: The current transaction-based approach with dynamic `bookedCount` calculation could still allow race conditions under extreme load.

**Solution**:
```typescript
// Implement Redis-based distributed lock
import Redis from 'ioredis';

async function acquireTimeSlotLock(timeSlotId: string, ttl: number = 30) {
  const lockKey = `lock:timeslot:${timeSlotId}`;
  const lockValue = crypto.randomUUID();
  
  const acquired = await redis.set(lockKey, lockValue, 'NX', 'EX', ttl);
  return acquired ? lockValue : null;
}

// Use in reservation creation
const lockToken = await acquireTimeSlotLock(timeSlotId);
if (!lockToken) {
  throw new Error('Could not acquire lock - please retry');
}
try {
  // Proceed with reservation
} finally {
  await releaseLock(timeSlotId, lockToken);
}
```

### 2. Implement Saga Pattern for Payment Flow
**Issue**: Payment intent creation happens outside the database transaction. If it fails, inventory remains locked.

**Solution**:
- Implement a saga orchestrator using AWS Step Functions
- Define compensating transactions for each step
- Add proper state management and rollback procedures

```typescript
// Example saga steps
const reservationSaga = {
  steps: [
    { name: 'createHold', compensate: 'releaseHold' },
    { name: 'createPaymentIntent', compensate: 'cancelPaymentIntent' },
    { name: 'capturePayment', compensate: 'refundPayment' },
    { name: 'confirmReservation', compensate: 'cancelReservation' }
  ]
};
```

### 3. Automated Hold Cleanup Job
**Issue**: The `releaseExpiredHolds()` method exists but no scheduled job is configured.

**Solution**:
```yaml
# serverless.yml
functions:
  cleanupExpiredHolds:
    handler: src/reservations/lambda/cleanupHolds.handler
    events:
      - schedule:
          rate: rate(5 minutes)
          enabled: true
    environment:
      HOLD_CLEANUP_BATCH_SIZE: 100
```

```typescript
// src/reservations/lambda/cleanupHolds.ts
export const handler = async () => {
  const service = new ReservationService({ database });
  const results = await service.releaseExpiredHolds();
  
  await cloudwatch.putMetricData({
    Namespace: 'Reservations',
    MetricData: [{
      MetricName: 'ExpiredHoldsReleased',
      Value: results.released,
      Unit: 'Count'
    }]
  });
};
```

## Priority 2: Reliability Improvements

### 4. Enhanced Webhook Processing
**Issue**: No deduplication, event storage, or dead letter queue for webhooks.

**Solution**:
```typescript
// Store webhook events
interface WebhookEvent {
  id: string;
  stripeEventId: string;
  type: string;
  payload: any;
  processedAt?: Date;
  attempts: number;
  lastError?: string;
}

// Process with deduplication
async function processWebhook(event: Stripe.Event) {
  // Check if already processed
  const existing = await db.webhookEvents.findByStripeId(event.id);
  if (existing?.processedAt) {
    return { duplicate: true };
  }
  
  // Store event
  await db.webhookEvents.upsert({
    stripeEventId: event.id,
    type: event.type,
    payload: event,
    attempts: 1
  });
  
  try {
    await processEvent(event);
    await db.webhookEvents.markProcessed(event.id);
  } catch (error) {
    await db.webhookEvents.recordFailure(event.id, error);
    throw error; // Let it go to DLQ
  }
}
```

### 5. Retry Logic with Exponential Backoff
**Issue**: No retry mechanism for transient failures.

**Solution**:
```typescript
import pRetry from 'p-retry';

async function createPaymentIntentWithRetry(params: CreatePaymentParams) {
  return pRetry(
    async () => {
      return await stripe.paymentIntents.create(params);
    },
    {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        logger.warn(`Payment intent creation attempt ${error.attemptNumber} failed`, {
          error: error.message,
          retriesLeft: error.retriesLeft
        });
      }
    }
  );
}
```

### 6. Rate Limiting Implementation
**Issue**: No rate limiting on reservation endpoints.

**Solution**:
```typescript
// API Gateway rate limiting
custom:
  apiGateway:
    usagePlan:
      quota:
        limit: 10000
        period: DAY
      throttle:
        rateLimit: 100
        burstLimit: 200

// Or application-level with Redis
async function checkRateLimit(userId: string, limit: number = 10) {
  const key = `ratelimit:reservation:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  
  if (current > limit) {
    throw new Error('Rate limit exceeded');
  }
}
```

## Priority 3: Monitoring & Observability

### 7. Enhanced Metrics and Alerting
```typescript
// Track key metrics
const metrics = {
  reservationCreated: new CloudWatch.Metric({
    namespace: 'Reservations',
    metricName: 'ReservationCreated',
    dimensions: { Environment: process.env.STAGE }
  }),
  
  paymentFailed: new CloudWatch.Metric({
    namespace: 'Payments',
    metricName: 'PaymentFailed',
    dimensions: { Environment: process.env.STAGE }
  }),
  
  holdExpired: new CloudWatch.Metric({
    namespace: 'Reservations',
    metricName: 'HoldExpired',
    dimensions: { Environment: process.env.STAGE }
  })
};

// Add alarms
const alarms = {
  highPaymentFailureRate: {
    metric: 'PaymentFailed',
    threshold: 5,
    evaluationPeriods: 2,
    period: 300 // 5 minutes
  }
};
```

### 8. Structured Logging
```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'reservations',
  logLevel: 'INFO'
});

// Use structured logging
logger.info('Reservation created', {
  reservationId: reservation.id,
  userId: userId,
  experienceId: experienceId,
  amount: totalPrice,
  discountApplied: totalDiscountAmount
});
```

## Priority 4: Additional Enhancements

### 9. Implement Circuit Breaker for External Services
```typescript
import CircuitBreaker from 'opossum';

const stripeCircuit = new CircuitBreaker(
  async (params) => stripe.paymentIntents.create(params),
  {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  }
);

stripeCircuit.on('open', () => {
  logger.error('Stripe circuit breaker opened');
  // Send alert
});
```

### 10. Add Database Connection Pooling Metrics
```typescript
// Monitor RDS Proxy connections
const poolMetrics = {
  activeConnections: await db.getActiveConnectionCount(),
  idleConnections: await db.getIdleConnectionCount(),
  waitingRequests: await db.getWaitingRequestCount()
};

await cloudwatch.putMetricData({
  Namespace: 'Database',
  MetricData: Object.entries(poolMetrics).map(([name, value]) => ({
    MetricName: name,
    Value: value,
    Unit: 'Count'
  }))
});
```

## Implementation Plan

### Phase 1 (Week 1-2)
- [ ] Implement distributed locking
- [ ] Add hold cleanup job
- [ ] Enhance webhook processing with deduplication

### Phase 2 (Week 3-4)
- [ ] Implement saga pattern for payment flow
- [ ] Add retry logic with exponential backoff
- [ ] Implement rate limiting

### Phase 3 (Week 5-6)
- [ ] Add comprehensive metrics and alerting
- [ ] Implement structured logging
- [ ] Add circuit breakers

### Phase 4 (Week 7-8)
- [ ] Performance testing and optimization
- [ ] Documentation updates
- [ ] Team training on new patterns

## Testing Strategy

### Unit Tests
- Test distributed lock acquisition and release
- Test saga compensation logic
- Test rate limiting logic

### Integration Tests
- Test full reservation flow with simulated failures
- Test webhook processing with duplicate events
- Test hold expiration scenarios

### Load Tests
- Simulate 1000 concurrent reservation attempts
- Test rate limiting under load
- Verify no race conditions occur

## Monitoring Dashboard

Create CloudWatch dashboard with:
- Reservation success/failure rates
- Payment processing times
- Hold expiration rates
- Webhook processing lag
- Error rates by type
- Lock contention metrics

## Documentation Updates

- Update API documentation with rate limits
- Document new retry behavior
- Add troubleshooting guide for common issues
- Create runbook for incident response

## Security Considerations

- Ensure distributed locks have TTL to prevent deadlocks
- Implement webhook replay attack prevention
- Add request signing for internal service calls
- Regular security audits of payment flow

## Rollback Plan

Each improvement should be:
- Feature-flagged for gradual rollout
- Backwards compatible
- Independently deployable
- Monitored for regression

## Success Metrics

- Reduce payment failures by 50%
- Achieve 99.9% reservation success rate
- Zero race condition incidents
- < 100ms p99 latency for reservation creation
- 100% webhook event processing (no data loss)