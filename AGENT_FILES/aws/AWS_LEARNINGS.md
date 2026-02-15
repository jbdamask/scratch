# AWS Deployment Learnings

This document contains hard-won lessons from building AWS apps with coding agents. Reference this when adding or changing AWS components in a project. If you learn a new lesson, generalize it from the current project and add it.

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
    RoleName: !Sub 'myapp-lambda-role-${Environment}'

Outputs:
  LambdaExecutionRoleArn:
    Export:
      Name: !Sub '${AWS::StackName}-LambdaRoleArn'

# In consuming stack - import
Role:
  Fn::ImportValue: !Sub 'myapp-api-gateway-${Environment}-LambdaRoleArn'
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
Fn::ImportValue: !Sub 'myapp-api-gateway-${Environment}-ApiId'
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
  --function-name myapp-logout-dev \
  --s3-bucket myapp-deployments-us-east-1 \
  --s3-key lambdas/dev/auth.zip
```

**Better Solution:** The deploy script should do this automatically after uploading zips. Upload to S3 is not deployment — updating the Lambda function code is.

**Key Insight:** "Code in git" ≠ "code on S3" ≠ "code running in Lambda." All three must be in sync. Verify with behavioral tests against live endpoints, not just `git status` or S3 listings.

---

## CloudFormation with S3 Templates

### 13. Lambda Needs S3 Permissions to Use CloudFormation TemplateURL
**Problem:** `CreateStackCommand` from Lambda failed with "S3 error: Access Denied" when using `TemplateURL: https://bucket.s3.amazonaws.com/templates/ec2.yaml`.

**Root Cause:** When a Lambda calls CloudFormation with a `TemplateURL`, CloudFormation reads the template using the **caller's credentials** (the Lambda's IAM role), not as the CloudFormation service. The Lambda role lacked `s3:GetObject` permission on the template files.

**Solution:** Add S3 read permission to the Lambda execution role:
```yaml
- PolicyName: S3TemplateAccess
  PolicyDocument:
    Version: '2012-10-17'
    Statement:
      - Effect: Allow
        Action:
          - s3:GetObject
        Resource:
          - !Sub 'arn:aws:s3:::${DeploymentBucket}/templates/*'
```

**Common Misunderstanding:** Adding a bucket policy for `cloudformation.amazonaws.com` does NOT help — CloudFormation doesn't fetch the template as itself, it uses the API caller's identity.

---

## Secrets Management

### 14. Never Pass Secrets as CloudFormation NoEcho Parameters
**Problem:** `aws cloudformation deploy --parameter-overrides JWTSecret=UsePreviousValue` set the literal string "UsePreviousValue" as the secret value (deploy doesn't support `UsePreviousValue=true` syntax). NoEcho parameters cannot be recovered once overwritten.

**Solution:** Store secrets in AWS Secrets Manager and have Lambdas/EC2 instances fetch them at runtime:
- Use a cached SecretsManager client that fetches once per Lambda cold start
- Lambda env vars contain `*_ARN` (e.g., `JWT_SECRET_ARN`) not secret values
- EC2 UserData uses `aws secretsmanager get-secret-value` at boot
- IAM roles need `secretsmanager:GetSecretValue` on `myapp-*` secrets

**Stack:** `myapp-secrets-dev` defines all secrets with cross-stack ARN exports.

### 15. Set Default Parameter Values to Prevent Accidental Overwrites
**Problem:** CloudFormation deploy reverted configuration values (e.g., OAuth credentials) back to old values, breaking functionality.

**Root Cause:** The template had no default values for certain parameters. A previous session had fixed the issue by directly updating Lambda env vars (bypassing CloudFormation). When the stack was deployed later, CloudFormation used the old parameter values stored in the stack, overwriting the direct fix.

**Solution:** Always set sensible default values for configuration parameters in CloudFormation templates:
```yaml
Parameters:
  SomeClientId:
    Type: String
    Default: actual-current-value  # Prevents accidental revert
    Description: Current value for the integration
```

**Key Insight:** Direct Lambda env var updates via AWS CLI are temporary fixes — they get overwritten on the next CloudFormation deploy. Always update the template defaults too, or the fix will be lost.

### 16. Lambda Needs SSM Permissions for Dynamic AMI Parameters
**Problem:** `CreateStackCommand` from Lambda failed with "User is not authorized to perform: ssm:GetParameters" when EC2 template used `AWS::SSM::Parameter::Value` for dynamic AMI lookup.

**Root Cause:** EC2 templates commonly use `AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>` to fetch the latest Ubuntu/Amazon Linux AMI dynamically. When Lambda calls CloudFormation, it uses the Lambda's IAM role credentials. The role needs `ssm:GetParameters` permission on the public AWS parameter paths.

**Solution:** Add SSM parameter read permission to the Lambda execution role:
```yaml
- PolicyName: SSMParameterAccess
  PolicyDocument:
    Version: '2012-10-17'
    Statement:
      - Effect: Allow
        Action:
          - ssm:GetParameters
        Resource:
          - 'arn:aws:ssm:*::parameter/aws/service/*'
```

**Note:** The resource ARN uses `::` (empty account ID) because AWS-provided parameters like `/aws/service/canonical/ubuntu/...` are in the global namespace, not account-specific.

---

## Lambda-Invoked CloudFormation

### 17. CloudFormation Uses Caller Credentials for ALL Resource Creation
**Problem:** Lambda calls `CreateStack` successfully, but individual resources fail with "not authorized to perform: ec2:CreateSecurityGroup" (or similar) even though the CloudFormation service should have permissions.

**Root Cause:** When Lambda (or any AWS SDK client) invokes CloudFormation, the service creates resources using the **caller's credentials**, not a CloudFormation service role. This is different from console-based deployments where CloudFormation assumes a service role. The Lambda's IAM role must have permissions for every resource type in the template.

**Solution:** Grant the Lambda role permissions for ALL resources the CloudFormation template creates:
```yaml
# If your CF template creates EC2 instances, security groups, and elastic IPs,
# the Lambda role needs ALL of these permissions:
- Effect: Allow
  Action:
    - ec2:RunInstances
    - ec2:TerminateInstances
    - ec2:CreateSecurityGroup
    - ec2:DeleteSecurityGroup
    - ec2:AuthorizeSecurityGroupIngress
    - ec2:AllocateAddress
    - ec2:ReleaseAddress
    # ... every EC2 action your template uses
  Resource: '*'
```

**Key Insight:** Audit your CloudFormation template for every `AWS::*` resource type and ensure the Lambda role has create/delete/describe permissions for each. A template with EC2, IAM, and Auto Scaling resources requires permissions across all three services.

### 18. IAM Resources in CloudFormation Require Full Role Lifecycle Permissions
**Problem:** CloudFormation stack fails with "not authorized to perform: iam:GetRole" when creating an EC2 instance that needs an instance profile.

**Root Cause:** EC2 instances with instance profiles require CloudFormation to create IAM roles and instance profiles. The Lambda role needs comprehensive IAM permissions—not just `iam:PassRole`.

**Solution:** Add complete IAM lifecycle permissions:
```yaml
# For IAM Roles
- Effect: Allow
  Action:
    - iam:CreateRole
    - iam:DeleteRole
    - iam:GetRole
    - iam:PassRole
    - iam:PutRolePolicy
    - iam:DeleteRolePolicy
    - iam:AttachRolePolicy
    - iam:DetachRolePolicy
    - iam:TagRole
    - iam:UntagRole
  Resource:
    - !Sub 'arn:aws:iam::${AWS::AccountId}:role/your-prefix-*'

# For Instance Profiles
- Effect: Allow
  Action:
    - iam:CreateInstanceProfile
    - iam:DeleteInstanceProfile
    - iam:GetInstanceProfile
    - iam:AddRoleToInstanceProfile
    - iam:RemoveRoleFromInstanceProfile
    - iam:TagInstanceProfile
    - iam:UntagInstanceProfile
  Resource:
    - !Sub 'arn:aws:iam::${AWS::AccountId}:instance-profile/your-prefix-*'
```

**Note:** Scope IAM permissions to a naming prefix (e.g., `your-app-*`) to limit blast radius while still allowing dynamic resource creation.

### 19. Stack Deletion Requires the Same Permissions as Creation (Plus More)
**Problem:** `DeleteStack` fails with "DELETE_FAILED" state, leaving orphaned resources (EC2 instances still running, Elastic IPs still allocated).

**Root Cause:** CloudFormation deletion uses the same caller credentials as creation. If the Lambda role lacks delete permissions, or lacks permissions needed during deletion checks, the stack gets stuck. Orphaned resources continue incurring costs.

**Solution:** Ensure the Lambda role has both create AND delete permissions for all resource types. Some services require additional permissions during deletion:
```yaml
# Auto Scaling requires DescribeScalingActivities during deletion
- Effect: Allow
  Action:
    - autoscaling:CreateAutoScalingGroup
    - autoscaling:DeleteAutoScalingGroup
    - autoscaling:DescribeAutoScalingGroups
    - autoscaling:DescribeScalingActivities    # Required for deletion!
    - autoscaling:TerminateInstanceInAutoScalingGroup
  Resource: '*'
```

**Recovery:** If a stack is stuck in DELETE_FAILED:
1. Add the missing permissions to the Lambda role
2. Retry deletion: `aws cloudformation delete-stack --stack-name <name>`
3. If still failing, manually delete resources, then delete stack with `--retain-resources`

### 20. Spot Instances via Auto Scaling Groups Require Launch Template Permissions
**Problem:** Creating spot instances via Auto Scaling Groups fails with "not authorized to perform: ec2:CreateLaunchTemplate".

**Root Cause:** Spot instances managed by Auto Scaling Groups use EC2 Launch Templates rather than direct instance launches. The Lambda role needs launch template permissions in addition to standard EC2 permissions.

**Solution:** Add launch template and Auto Scaling permissions:
```yaml
# Launch Templates
- Effect: Allow
  Action:
    - ec2:CreateLaunchTemplate
    - ec2:DeleteLaunchTemplate
    - ec2:DescribeLaunchTemplates
    - ec2:DescribeLaunchTemplateVersions
  Resource: '*'

# Auto Scaling
- Effect: Allow
  Action:
    - autoscaling:CreateAutoScalingGroup
    - autoscaling:DeleteAutoScalingGroup
    - autoscaling:UpdateAutoScalingGroup
    - autoscaling:DescribeAutoScalingGroups
    - autoscaling:DescribeScalingActivities
    - autoscaling:SetDesiredCapacity
    - autoscaling:TerminateInstanceInAutoScalingGroup
  Resource: '*'
```

---

## EC2 UserData

### 21. `awscli` Apt Package Does Not Exist on Ubuntu 24.04
**Problem:** EC2 UserData script silently failed partway through. Only the first progress report (`instance_launching`) ever reached the API. The application user, SSH keys, tool installations, and remaining progress reports never executed.

**Root Cause:** The UserData script had `apt-get install -y ... awscli`, but on Ubuntu 24.04 Noble, the `awscli` package is not available in the default apt repositories. Combined with `set -e` at the top of the script, the apt failure killed the entire script immediately. Everything after the failed apt-get line never ran.

**Symptoms:**
- Server stuck in `provisioning` state with `provisioningStep: instance_launching`
- SSH returns "Permission denied (publickey)" (user was never created)
- EC2 console output (`get-console-output`) shows: `E: Package 'awscli' has no installation candidate`

**Solution:** Use the official AWS CLI v2 installer instead of the apt package:
```bash
# Instead of: apt-get install -y awscli
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws
```

**Key Insight:** Never assume apt packages available on Ubuntu 22.04 exist on 24.04. The official AWS CLI v2 installer works reliably across all Ubuntu versions. When UserData stops partway through, check `get-console-output` first — the problem may be that the script crashed before reaching the code you're debugging.

### 22. `set -e` in UserData Makes Failures Silent and Total
**Problem:** A single `apt-get` failure caused the entire UserData script to abort with no visible error in the application. The server appeared to provision normally (CloudFormation `CREATE_COMPLETE`) but was completely unconfigured.

**Root Cause:** `set -e` causes bash to exit immediately on any non-zero exit code. CloudFormation reports `CREATE_COMPLETE` when the EC2 instance launches — it doesn't wait for or monitor UserData execution. So infrastructure looks healthy while the software setup is completely broken.

**Solution:** For critical operations, handle errors explicitly rather than relying on `set -e` to catch everything:
```bash
# Option 1: Use || to handle expected failures
apt-get install -y some-package || echo "WARNING: some-package not available"

# Option 2: Check console output when debugging
aws ec2 get-console-output --instance-id i-xxx --output text
```

**Diagnostic Steps When UserData Seems Stuck:**
1. Check EC2 console output: `aws ec2 get-console-output --instance-id <id>`
2. Look for the exact failure line in the cloud-init log
3. Don't assume the Lambda/API/WebSocket pipeline is broken — the EC2 may never have sent the updates

---

### 23. CloudFormation Templates Over 51,200 Bytes Require S3 Upload
**Problem:** `aws cloudformation deploy` failed with "Templates with a size greater than 51,200 bytes must be deployed via an S3 Bucket."

**Root Cause:** As templates grow (adding Lambda functions, API methods, permissions), they exceed the 51KB inline limit for `deploy`.

**Solution:** Add `--s3-bucket` and `--s3-prefix` to the deploy command:
```bash
aws cloudformation deploy \
  --template-file infrastructure/my-template.yaml \
  --s3-bucket myapp-deployments-us-east-1 \
  --s3-prefix cfn-templates \
  --stack-name myapp-lambdas-dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides ...
```

**Key Insight:** The deployment S3 bucket you already use for Lambda zips works fine for templates too. CloudFormation automatically uploads, hashes, and references the template. Plan for this from the start — templates only grow.

---

## S3 Uploads

### 24. Browser Direct-to-S3 Uploads via Presigned URLs Need CORS on the Bucket
**Problem:** Frontend uploads a file to S3 via a presigned PUT URL. Browser blocks the request with "No 'Access-Control-Allow-Origin' header is present on the requested resource."

**Root Cause:** Presigned URLs let the browser upload directly to S3, bypassing API Gateway. Since the frontend is served from CloudFront (different origin than S3), the browser sends a CORS preflight (OPTIONS) to S3. Without CORS configuration on the S3 bucket, S3 rejects the preflight.

**Solution:** Use a dedicated uploads staging bucket with CORS configured, not the frontend asset bucket:
```yaml
UploadsBucket:
  Type: AWS::S3::Bucket
  Properties:
    CorsConfiguration:
      CorsRules:
        - AllowedHeaders: ['*']
          AllowedMethods: [PUT]
          AllowedOrigins: ['https://your-cloudfront-domain.cloudfront.net']
          ExposedHeaders: [ETag]
          MaxAge: 3600
    LifecycleConfiguration:
      Rules:
        - Id: AutoDeleteUploads
          Status: Enabled
          ExpirationInDays: 1
    NotificationConfiguration:
      EventBridgeConfiguration:
        EventBridgeEnabled: true
```

**Architecture Pattern:** Uploads staging bucket → EventBridge S3 event → processing Lambda → copies to final destination bucket. This keeps CORS isolated to the uploads bucket, validates/transforms files before they reach production, and is extensible for different upload types via context-based routing.

**Key Insight:** Never add CORS to your frontend/CDN bucket just for uploads. Use a separate staging bucket with CORS, lifecycle cleanup, and EventBridge notifications.

---

## EventBridge

### 25. EventBridge PutEvents Can Return 200 OK With Failed Entries
**Problem:** Admin endpoint reported "event injected successfully" but the EventBridge handler Lambda was never triggered.

**Root Cause:** `EventBridgeClient.send(PutEventsCommand)` returns HTTP 200 even when individual entries fail to inject. Failures are reported in the response body via `FailedEntryCount` and per-entry `ErrorCode`/`ErrorMessage` fields.

**Solution:** Always check `FailedEntryCount` after PutEvents:
```typescript
const result = await eventBridge.send(new PutEventsCommand({ Entries: [...] }))
if (result.FailedEntryCount && result.FailedEntryCount > 0) {
  console.error('EventBridge PutEvents had failures:', JSON.stringify(result.Entries))
  throw new Error('Failed to inject event into EventBridge')
}
```

### 26. Lambda::Permission Required Per-Function for API Gateway
**Problem:** New API Gateway endpoint returned 500 Internal Server Error. Lambda CloudWatch logs showed zero invocations.

**Root Cause:** Each Lambda function invoked by API Gateway needs its own `AWS::Lambda::Permission` resource. Without it, API Gateway gets "Access Denied" when trying to invoke the Lambda. The error isn't visible in the Lambda's logs because the invocation is blocked at the API Gateway → Lambda boundary.

**Solution:** Add a Lambda permission for every Lambda function that API Gateway calls:
```yaml
MyFunctionPermission:
  Type: AWS::Lambda::Permission
  Properties:
    FunctionName: !Ref MyFunction
    Action: lambda:InvokeFunction
    Principal: apigateway.amazonaws.com
    SourceArn: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*/*'
```

**Key Insight:** When an API Gateway endpoint returns 500 and the Lambda has no logs at all, the first thing to check is whether the `Lambda::Permission` exists.

### 27. WebSocket API Gateway Has a 10-Minute Idle Connection Timeout
**Problem:** WebSocket connections appeared to "fail" repeatedly — browser showed reconnection cycles every ~10 minutes during long-running operations like server provisioning.

**Root Cause:** AWS API Gateway WebSocket has a default idle connection timeout of 10 minutes. If no messages are sent over the connection for 10 minutes, API Gateway closes it. The client then reconnects, which the user may perceive as "connection failures."

**Impact:** This is normal behavior, not a bug. During long operations with sparse updates, WebSocket connections will reconnect periodically. Messages sent during the brief reconnection window (~1-2 seconds) could be missed.

**Mitigation Options:**
- Accept periodic reconnections (simplest, acceptable for MVP)
- Implement server-side ping/pong frames every 5 minutes to keep connections alive
- On the client, queue/replay missed messages using a "last received timestamp" mechanism

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
11. [ ] Never pass secrets via CloudFormation parameters — use Secrets Manager ARNs
12. [ ] If Lambda calls CloudFormation with TemplateURL, ensure Lambda role has s3:GetObject on templates
13. [ ] Set sensible default values for CloudFormation parameters to prevent accidental overwrites
14. [ ] If EC2 templates use dynamic AMI parameters (AWS::SSM::Parameter::Value), ensure Lambda role has ssm:GetParameters
15. [ ] If Lambda invokes CloudFormation, audit the template for ALL resource types and grant corresponding permissions
16. [ ] For EC2 with instance profiles, Lambda role needs full IAM lifecycle permissions (CreateRole, CreateInstanceProfile, etc.)
17. [ ] Include deletion permissions (DescribeScalingActivities for ASG) — stuck DELETE_FAILED stacks leave orphaned resources
18. [ ] For spot instances via ASG, add launch template permissions (ec2:CreateLaunchTemplate, etc.)
19. [ ] Never use `apt-get install -y awscli` on Ubuntu 24.04 — use the official AWS CLI v2 installer
20. [ ] When UserData stops partway through, check `get-console-output` before debugging the backend pipeline
21. [ ] When templates exceed 51KB, use `--s3-bucket` and `--s3-prefix` with `aws cloudformation deploy`
22. [ ] For browser direct-to-S3 uploads via presigned URLs, use a dedicated uploads bucket with CORS — never add CORS to your frontend bucket
23. [ ] After EventBridge `PutEvents`, always check `FailedEntryCount` — a 200 response can still contain failed entries
24. [ ] Every Lambda invoked by API Gateway needs its own `AWS::Lambda::Permission` — missing permission causes 500 with zero Lambda logs
25. [ ] WebSocket connections drop every ~10 min of inactivity due to API Gateway idle timeout — this is normal, not a bug
26. [ ] EventBridge spot interruption rule must target the Lambda ARN, not the function name — use `!GetAtt Function.Arn`
27. [ ] Spot interruption handler needs the same broad env vars as your server creation Lambda if doing auto-replacement
28. [ ] When adding new API Gateway resources, deploy api-gateway stack FIRST, then lambdas stack — the lambdas stack imports the resource IDs

---

## Spot Interruption Handling — General Lessons

### Testing Spot Interruptions Without Waiting for Real Events
**Problem:** Real EC2 spot interruptions are unpredictable and can't be triggered on demand, making it hard to test interruption handling.

**Solution:** Build a simulator endpoint that directly invokes the interruption handler Lambda with a synthetic EventBridge-style payload (using `Lambda InvokeCommand`), bypassing EventBridge itself. This is necessary because EventBridge blocks `PutEvents` with `aws.*` sources — only genuine AWS events can use those source prefixes.

**Verification Checklist:**
- [ ] Handler Lambda receives and processes the synthetic event
- [ ] Database records updated with interruption metadata
- [ ] Real-time notifications (WebSocket/push) delivered to the user
- [ ] Auto-replacement logic triggers if configured
- [ ] Original resource linked to its replacement in the database
