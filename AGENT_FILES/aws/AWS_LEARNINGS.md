# AWS Deployment Learnings

Hard-won lessons from deploying Rocky Surf to AWS. Reference this before making infrastructure changes.

---

## API Gateway

### 1. API Gateway Methods vs Resources Are Different Things
**Problem:** Created API Gateway resources (URL paths like `/auth/github`, `/servers`) but got "Missing Authentication Token" errors when calling them.

**Root Cause:** Resources define the URL structure, but you also need to create Methods (GET, POST, OPTIONS) with Lambda integrations attached. Without methods, the paths exist but nothing handles requests.

**Solution:** Always define both the resource AND the methods with their Lambda proxy integrations:
```yaml
# Resource defines the path
ServersResource:
  Type: AWS::ApiGateway::Resource
  Properties:
    PathPart: servers

# Method defines what happens when you call it
ServersGetMethod:
  Type: AWS::ApiGateway::Method
  Properties:
    ResourceId: !Ref ServersResource
    HttpMethod: GET
    Integration:
      Type: AWS_PROXY
      Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${ListServersFunction.Arn}/invocations'
```

### 2. API Gateway Deployments Don't Auto-Update
**Problem:** Added new methods to API Gateway via CloudFormation, stack updated successfully, but new endpoints returned 403/404.

**Root Cause:** `AWS::ApiGateway::Deployment` is immutable. CloudFormation only creates a new deployment when the deployment resource itself changes. Adding methods via DependsOn doesn't trigger redeployment.

**Solution:** After updating Lambda/API Gateway stacks, force a new deployment:
```bash
aws apigateway create-deployment \
  --rest-api-id YOUR_API_ID \
  --stage-name dev \
  --description "Deploy new methods"
```

Or add a timestamp/hash to force CloudFormation to recreate the deployment:
```yaml
ApiDeployment:
  Type: AWS::ApiGateway::Deployment
  Properties:
    Description: !Sub 'Deployment ${AWS::StackName}-${Timestamp}'
```

### 3. CORS Requires OPTIONS Methods
**Problem:** Browser CORS preflight requests failed with 403.

**Root Cause:** Browsers send OPTIONS preflight requests before cross-origin POST/PUT/DELETE. Without an OPTIONS method configured, API Gateway rejects the preflight.

**Solution:** Add OPTIONS method with MOCK integration for every resource:
```yaml
ServersOptionsMethod:
  Type: AWS::ApiGateway::Method
  Properties:
    HttpMethod: OPTIONS
    AuthorizationType: NONE
    Integration:
      Type: MOCK
      RequestTemplates:
        application/json: '{"statusCode": 200}'
      IntegrationResponses:
        - StatusCode: '200'
          ResponseParameters:
            method.response.header.Access-Control-Allow-Headers: "'Content-Type,Authorization'"
            method.response.header.Access-Control-Allow-Methods: "'GET,POST,OPTIONS'"
            method.response.header.Access-Control-Allow-Origin: "'*'"
    MethodResponses:
      - StatusCode: '200'
        ResponseParameters:
          method.response.header.Access-Control-Allow-Headers: true
          method.response.header.Access-Control-Allow-Methods: true
          method.response.header.Access-Control-Allow-Origin: true
```

---

## Lambda

### 4. Lambda Handler Paths Must Match Build Output Structure
**Problem:** Lambda returned "Handler not found" errors.

**Root Cause:** esbuild outputs files to subdirectories (e.g., `auth/initiateOAuth.mjs`), but CloudFormation handler was set to just `initiateOAuth.handler`.

**Solution:** Include the directory prefix in the handler path:
```yaml
Handler: auth/initiateOAuth.handler  # NOT just initiateOAuth.handler
```

### 5. ES Modules Use .mjs Extension
**Problem:** Deploy script couldn't find Lambda files - "zip warning: name not matched: lib/*.js"

**Root Cause:** esbuild with `format: 'esm'` outputs `.mjs` files, not `.js` files.

**Solution:** Package the correct extension:
```bash
zip -j auth.zip dist/auth/*.mjs  # NOT *.js
```

---

## IAM

### 6. IAM Role Names Are Global Per Account
**Problem:** CloudFormation stack failed with "Role already exists".

**Root Cause:** Defined the same IAM role in multiple stacks. IAM role names must be unique across the entire AWS account.

**Solution:** Define the role in one stack and import it in others:
```yaml
# In api-gateway.yaml - define and export
LambdaExecutionRole:
  Type: AWS::IAM::Role
  Properties:
    RoleName: !Sub 'rocky-surf-lambda-role-${Environment}'

Outputs:
  LambdaExecutionRoleArn:
    Export:
      Name: !Sub '${AWS::StackName}-LambdaRoleArn'

# In lambdas.yaml - import
Role:
  Fn::ImportValue: !Sub 'rocky-surf-api-gateway-${Environment}-LambdaRoleArn'
```

---

## S3 & CloudFront

### 7. S3 Public Access May Be Blocked at Account Level
**Problem:** `PutBucketPolicy` failed with "Access Denied" even with correct IAM permissions.

**Root Cause:** AWS accounts often have account-level "Block Public Access" settings enabled by default. These override bucket-level policies.

**Solution:** Don't fight it. Use CloudFront with Origin Access Control (OAC) instead:
- More secure (bucket stays private)
- Better performance (CDN caching)
- Required for HTTPS with custom domains anyway

```yaml
CloudFrontOriginAccessControl:
  Type: AWS::CloudFront::OriginAccessControl
  Properties:
    OriginAccessControlConfig:
      SigningBehavior: always
      SigningProtocol: sigv4
      OriginAccessControlOriginType: s3
```

### 8. CloudFront Compression Requires Caching
**Problem:** CloudFront stack failed with "EnableAcceptEncodingGzip is not valid for CachePolicyConfig with caching disabled".

**Root Cause:** Can't enable compression on cache policies that have `MinTTL: 0, MaxTTL: 0, DefaultTTL: 0`.

**Solution:** Disable compression for no-cache policies:
```yaml
IndexCachePolicy:
  Type: AWS::CloudFront::CachePolicy
  Properties:
    CachePolicyConfig:
      MinTTL: 0
      MaxTTL: 0
      DefaultTTL: 0
      ParametersInCacheKeyAndForwardedToOrigin:
        EnableAcceptEncodingGzip: false  # Must be false when caching disabled
```

---

## CloudFormation General

### 9. Output Names Must Match Query Keys
**Problem:** Deploy script returned empty string for API Gateway URL.

**Root Cause:** Script queried for output key `ApiUrl` but the CloudFormation template exported `ApiEndpoint`.

**Solution:** Always verify output names match between template and scripts:
```bash
# Wrong
aws cloudformation describe-stacks --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue"

# Right
aws cloudformation describe-stacks --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue"
```

### 10. Cross-Stack References Use Export Names, Not Output Keys
**Problem:** `Fn::ImportValue` returned "Export not found".

**Root Cause:** Import references the Export Name, not the Output key. These can be different.

**Solution:**
```yaml
# Exporting stack
Outputs:
  ApiId:                          # This is the Output Key
    Value: !Ref RestApi
    Export:
      Name: !Sub '${AWS::StackName}-ApiId'  # This is what you import

# Importing stack - use the Export Name
Fn::ImportValue: !Sub 'rocky-surf-api-gateway-${Environment}-ApiId'
```

---

## Frontend

### 11. Trailing Slashes Cause Double-Slash URLs
**Problem:** API calls went to `/dev//auth/github` (double slash).

**Root Cause:** `VITE_API_BASE_URL` ended with `/` and endpoint paths started with `/`.

**Solution:** Strip trailing slashes from base URLs:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
```

### 12. S3 Lambda Zips Can Go Stale — Deploy Script Must Update Function Code
**Problem:** Logout Lambda returned 502 with `Cannot find module 'logout'`, even though the handler path was correct and the code was committed to git.

**Root Cause:** The `auth.zip` on S3 was uploaded before `logout.ts` existed. CloudFormation created the Lambda pointing to `auth.zip`, but the zip only had 3 of 4 auth handlers. Uploading a new zip to S3 doesn't automatically update running Lambdas — they cache the code from their last deployment.

**Solution:** After uploading new code to S3, explicitly update each Lambda's function code:
```bash
aws lambda update-function-code \
  --function-name rocky-surf-logout-dev \
  --s3-bucket rocky-surf-deployments-us-east-1 \
  --s3-key lambdas/dev/auth.zip
```

**Better Solution:** The deploy script should do this automatically after uploading zips. Upload to S3 is not deployment — updating the Lambda function code is.

**Key Insight:** "Code in git" ≠ "code on S3" ≠ "code running in Lambda." All three must be in sync. Verify with behavioral tests against live endpoints, not just `git status` or S3 listings.

---

## Deployment Checklist

Before deploying infrastructure changes:

1. [ ] Verify CloudFormation output keys match what scripts expect
2. [ ] Check IAM role names aren't duplicated across stacks
3. [ ] Ensure Lambda handler paths include directory prefixes
4. [ ] Package correct file extensions (.mjs for ES modules)
5. [ ] Add OPTIONS methods for all CORS-enabled endpoints
6. [ ] After adding API Gateway methods, force a new deployment
7. [ ] For S3 static hosting, prefer CloudFront+OAC over public buckets
8. [ ] After uploading Lambda zips to S3, update each Lambda's function code
9. [ ] Verify every endpoint returns expected status codes (not 502) after deploy
10. [ ] Test with `curl -v` before testing in browser (clearer errors)
