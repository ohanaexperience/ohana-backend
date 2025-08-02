# RDS Proxy Cost Optimization

This document describes the changes made to conditionally enable RDS Proxy only for production environments, saving ~$164/month in dev/staging costs.

## Changes Made

### 1. Conditional RDS Proxy Resources
- Updated `resources/rds-proxy.yml` to only create RDS Proxy resources when stage is 'production'
- Added CloudFormation condition: `IsProduction: !Equals [${self:provider.stage}, production]`

### 2. Stage-Based Configuration
- Added `useRdsProxy` configuration in `serverless.yml`:
  ```yaml
  useRdsProxy:
      production: true
      staging: false
      dev: false
  ```

### 3. Database Connection Logic
- Updated `src/database/proxy-config.ts` to handle both proxy and direct connections
- Added `createRDSDirectConfig()` function for direct Aurora connections
- Connection selection based on environment variables and stage

### 4. Lambda Environment Variables
- Lambda functions now receive both proxy and cluster endpoints
- `USE_RDS_PROXY` flag determines which endpoint to use
- Example configuration:
  ```yaml
  environment:
      USE_RDS_PROXY: ${self:custom.useRdsProxy.${self:provider.stage}}
      RDS_PROXY_ENDPOINT:
          Fn::If:
              - IsProduction
              - !GetAtt PostgresRDSProxy.Endpoint
              - ""
      RDS_CLUSTER_ENDPOINT: !GetAtt PostgresRDSServerlessCluster.Endpoint.Address
      RDS_CLUSTER_PORT: !GetAtt PostgresRDSServerlessCluster.Endpoint.Port
  ```

## How It Works

1. **Production Stage**: RDS Proxy is created and Lambda functions connect through it
2. **Dev/Staging**: No RDS Proxy is created, Lambda functions connect directly to Aurora cluster
3. **Connection Decision**: Made at runtime based on `USE_RDS_PROXY` environment variable

## Cost Savings

- **RDS Proxy Cost**: ~$164/month per environment
- **Savings**: $328/month (dev + staging environments)
- **Annual Savings**: ~$3,936

## Migration Guide

To apply these changes to all Lambda functions:

1. Update each function's environment variables in `functions/*.yml` files
2. Replace the old configuration:
   ```yaml
   # Old
   RDS_PROXY_ENDPOINT: !GetAtt PostgresRDSProxy.Endpoint
   USE_RDS_PROXY: true
   ```
   With the new conditional configuration shown above

3. Deploy changes:
   ```bash
   serverless deploy --stage dev
   serverless deploy --stage staging
   serverless deploy --stage production
   ```

## Rollback

If issues occur, you can quickly revert to always using RDS Proxy:

1. Update `serverless.yml`:
   ```yaml
   useRdsProxy:
       production: true
       staging: true  # Change back to true
       dev: true      # Change back to true
   ```

2. Remove the `Condition: IsProduction` lines from `resources/rds-proxy.yml`

3. Redeploy all stages

## Monitoring

After deployment, monitor:
- Lambda function errors related to database connections
- Database connection pool metrics
- Lambda cold start times (may increase slightly without proxy)

## Additional Optimizations

Consider these further cost reductions:
1. Reduce Aurora max ACUs from 8 to 2-4
2. Disable CloudWatch logs (already implemented)
3. Reduce backup retention to 1 day (already implemented)
4. Consider Aurora Serverless v1 for dev environments (auto-pause capability)