# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Testing
- `npm test` - Run unit tests only
- `npm run test:all` - Run all tests (unit, integration, e2e)
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run e2e tests with .env.e2e
- `npm run test:e2e:dev` - Run e2e tests against dev environment
- `npm run test:e2e:staging` - Run e2e tests against staging environment
- `npm run test:e2e:local` - Run e2e tests against local environment
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:coverage` - Run unit tests with coverage report
- To run a single test file: `npm test -- path/to/test.ts`

### Database Operations
- `npm run db:generate` - Generate Drizzle migrations from schema changes
- `npm run db:seed` - Run database seeding via Lambda
- `serverless invoke -f runMigrations --stage dev` - Run migrations for specific stage

### Documentation
- `npm run docs:build` - Build API documentation with Redocly
- `npm run docs:deploy` - Deploy documentation to S3

### Deployment
- `serverless deploy --stage dev` - Deploy to dev environment
- `serverless deploy --stage staging` - Deploy to staging environment
- `serverless deploy --stage production` - Deploy to production environment
- `serverless deploy function -f functionName --stage dev` - Deploy single function

### Local Development
- `serverless invoke local -f functionName -p event.json` - Test Lambda function locally
- `serverless logs -f functionName --stage dev` - View function logs

### Cleanup Scripts
- `npm run cleanup:users` - Clean up test users from Cognito
- `npm run cleanup:users:dry` - Dry run of user cleanup
- `npm run cleanup:users:all` - Clean up all @example.com users

## High-Level Architecture

### Serverless Application Structure
This is a serverless marketplace API built on AWS using the Serverless Framework v4. The application follows Domain-Driven Design (DDD) principles with clear separation between different business domains.

### Core Technology Stack
- **Runtime**: Node.js 20.x on AWS Lambda
- **Database**: PostgreSQL via AWS RDS with Drizzle ORM
- **Authentication**: AWS Cognito with JWT tokens
- **File Storage**: AWS S3 with CloudFront CDN
- **Payments**: Stripe Connect for marketplace transactions
- **API Gateway**: AWS API Gateway v2 (HTTP API)

### Domain Organization
Each domain in `src/` follows a consistent layered architecture:

1. **Lambda Layer** (`lambda/`): Entry points for serverless functions
2. **Controller Layer** (`controllers/`): Request orchestration and response formatting
3. **Service Layer** (`services/`): Business logic implementation
4. **Validation Layer** (`validations/`): Zod schemas for input validation
5. **Database Layer**: Query managers in `src/database/postgres/query_managers/`

### Key Architectural Patterns

#### Database Access Pattern
All database operations go through a centralized Postgres client that manages RDS Proxy connections:
```typescript
// Always use the query manager pattern:
import { experienceQueryManager } from "@/database/postgres/query_managers";
const experience = await experienceQueryManager.getById(db, id);
```

#### Error Handling Pattern
Centralized error definitions in `src/errors/` with consistent error responses:
```typescript
throw new InvalidInputError("Validation failed", { field: "email" });
```

#### Middleware Pattern
Lambda functions use `middy` middleware for cross-cutting concerns:
- CORS handling
- JSON body parsing
- Header normalization
- Error handling

#### Authentication Flow
1. API Gateway authorizers validate JWT tokens from Cognito
2. User context is passed to Lambda functions
3. Role-based access control (User/Host/Admin) is enforced at the controller level

### Database Schema Management
- Schemas defined in `src/database/schemas/` using Drizzle ORM
- Migrations generated with `npm run db:generate`
- Migrations auto-run on deployment via serverless hook
- Query managers provide type-safe database operations

### API Endpoint Structure
All endpoints follow RESTful conventions with versioning:
- Public endpoints: `/v1/{domain}/public/*` (no auth required)
- User endpoints: `/v1/{domain}/*` (requires user auth)
- Host endpoints: `/v1/{domain}/host/*` (requires host role)
- Admin endpoints: `/v1/admin/*` (requires admin role)

### Environment Configuration
- Development: `.env` file for local development
- E2E Testing: `.env.e2e` file for test configuration
- AWS Deployment: Environment variables set in `serverless.yml`
- Secrets: Stored in AWS Secrets Manager

### Testing Strategy
- **Unit Tests**: Test individual functions and services in isolation
- **Integration Tests**: Test database operations and service interactions
- **E2E Tests**: Test full API flows against deployed environments
- Mock data generators in `tests/helpers/` for consistent test data

### Asset Management
- Images stored in S3 bucket with CloudFront CDN distribution
- Category images in `assets/categories/` bundled with Lambda deployment
- Upload endpoints generate presigned URLs for direct S3 uploads
- Automatic image optimization and CDN caching

### Key Services Integration
- **Stripe Connect**: Host onboarding and payment processing
- **Twilio**: SMS notifications (future implementation)
- **Google OAuth**: Social login integration via Cognito
- **AWS SNS**: Transactional SMS for authentication

### Development Workflow
1. Create/modify schemas in `src/database/schemas/`
2. Generate migrations with `npm run db:generate`
3. Implement business logic in appropriate domain service
4. Add validation schemas using Zod
5. Create Lambda handler in `lambda/` directory
6. Configure endpoint in `functions/*.yml`
7. Write tests (unit and integration)
8. Deploy to dev environment for testing