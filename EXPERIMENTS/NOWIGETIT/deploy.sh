#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────
# NowIGetIt - Deploy to AWS
#
# Usage:
#   ./deploy.sh                         # Deploy with defaults
#   STACK_NAME=my-stack ./deploy.sh     # Custom stack name
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - .env file with ANTHROPIC_API_KEY
# ─────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STACK_NAME="${STACK_NAME:-nowigetit}"
REGION="${AWS_REGION:-us-east-1}"
DEPLOY_BUCKET="${DEPLOY_BUCKET:-${STACK_NAME}-deployments-${REGION}}"
DOMAIN_NAME="${DOMAIN_NAME:-nowigetit.us}"

# Load .env
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Error: ANTHROPIC_API_KEY must be set in .env or environment"
  exit 1
fi

echo "==> Deploying NowIGetIt (stack: $STACK_NAME, region: $REGION)"

# ─── Step 1a: Store secrets in Secrets Manager ───────────────────

echo "==> Storing secrets in Secrets Manager..."
secret_name="${STACK_NAME}/anthropic-api-key"
secret_desc="Anthropic API key for Claude — used by the NowIGetIt process Lambda"

if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$REGION" > /dev/null 2>&1; then
  aws secretsmanager put-secret-value \
    --secret-id "$secret_name" \
    --secret-string "$ANTHROPIC_API_KEY" \
    --region "$REGION" > /dev/null
  aws secretsmanager update-secret \
    --secret-id "$secret_name" \
    --description "$secret_desc" \
    --region "$REGION" > /dev/null
  aws secretsmanager tag-resource \
    --secret-id "$secret_name" \
    --region "$REGION" \
    --tags Key=Application,Value=NowIGetIt Key=Stack,Value="$STACK_NAME" > /dev/null
else
  aws secretsmanager create-secret \
    --name "$secret_name" \
    --description "$secret_desc" \
    --secret-string "$ANTHROPIC_API_KEY" \
    --region "$REGION" \
    --tags Key=Application,Value=NowIGetIt Key=Stack,Value="$STACK_NAME" > /dev/null
fi

# ─── Step 1b: Create deployment bucket if needed ─────────────────

echo "==> Ensuring deployment bucket exists: $DEPLOY_BUCKET"
if ! aws s3api head-bucket --bucket "$DEPLOY_BUCKET" 2>/dev/null; then
  aws s3api create-bucket --bucket "$DEPLOY_BUCKET" --region "$REGION" \
    $([ "$REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$REGION" || echo "")
  echo "    Created bucket: $DEPLOY_BUCKET"
fi

# ─── Step 1c: Look up Route 53 hosted zone ───────────────────────

echo "==> Looking up Route 53 hosted zone for $DOMAIN_NAME..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name "$DOMAIN_NAME" \
  --query "HostedZones[?Name=='${DOMAIN_NAME}.'].Id" \
  --output text | sed 's|/hostedzone/||')

if [ -z "$HOSTED_ZONE_ID" ]; then
  echo "Error: No Route 53 hosted zone found for $DOMAIN_NAME"
  exit 1
fi
echo "    Hosted zone: $HOSTED_ZONE_ID"

# ─── Step 1d: Provision ACM certificate ──────────────────────────

echo "==> Checking ACM certificate for $DOMAIN_NAME..."
CERT_ARN=$(aws acm list-certificates \
  --region "$REGION" \
  --query "CertificateSummaryList[?DomainName=='${DOMAIN_NAME}'].CertificateArn" \
  --output text)

if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" = "None" ]; then
  echo "    Requesting new certificate..."
  CERT_ARN=$(aws acm request-certificate \
    --domain-name "$DOMAIN_NAME" \
    --subject-alternative-names "www.${DOMAIN_NAME}" \
    --validation-method DNS \
    --region "$REGION" \
    --query 'CertificateArn' \
    --output text)
  echo "    Certificate ARN: $CERT_ARN"

  # Wait for DNS validation details to become available
  echo "    Waiting for validation details..."
  sleep 10

  # Create DNS validation records in Route 53
  VALIDATION_RECORDS=$(aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --region "$REGION" \
    --query 'Certificate.DomainValidationOptions[].ResourceRecord' \
    --output json)

  # Build Route 53 change batch from validation records
  CHANGE_BATCH=$(echo "$VALIDATION_RECORDS" | python3 -c "
import json, sys
records = json.load(sys.stdin)
seen = set()
changes = []
for r in records:
    key = r['Name']
    if key not in seen:
        seen.add(key)
        changes.append({
            'Action': 'UPSERT',
            'ResourceRecordSet': {
                'Name': r['Name'],
                'Type': r['Type'],
                'TTL': 300,
                'ResourceRecords': [{'Value': r['Value']}]
            }
        })
print(json.dumps({'Changes': changes}))
")

  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "$CHANGE_BATCH" > /dev/null

  echo "    DNS validation records created. Waiting for certificate validation..."
  aws acm wait certificate-validated \
    --certificate-arn "$CERT_ARN" \
    --region "$REGION"
  echo "    Certificate validated!"
else
  echo "    Using existing certificate: $CERT_ARN"
fi

# ─── Step 2: Package Lambda code ────────────────────────────────

echo "==> Packaging Lambda code..."
BUILD_DIR=$(mktemp -d)
trap "rm -rf $BUILD_DIR" EXIT

# Install dependencies into the build dir
pip install -q -t "$BUILD_DIR" \
  --platform manylinux2014_x86_64 --only-binary=:all: \
  anthropic python-dotenv 2>/dev/null

# Copy Lambda handler files
cp "$SCRIPT_DIR/backend/lambda_upload.py" "$BUILD_DIR/"
cp "$SCRIPT_DIR/backend/lambda_process.py" "$BUILD_DIR/"
cp "$SCRIPT_DIR/backend/lambda_status.py" "$BUILD_DIR/"
cp "$SCRIPT_DIR/backend/generator.py" "$BUILD_DIR/"
cp "$SCRIPT_DIR/backend/s3_publisher.py" "$BUILD_DIR/"

# Create zip
LAMBDA_ZIP="$SCRIPT_DIR/lambda-code.zip"
(cd "$BUILD_DIR" && zip -q -r "$LAMBDA_ZIP" .)
ZIP_SIZE=$(du -h "$LAMBDA_ZIP" | cut -f1)
echo "    Package size: $ZIP_SIZE"

# ─── Step 3: Upload Lambda zip to S3 ────────────────────────────

S3_KEY="nowigetit/lambda-code.zip"
echo "==> Uploading Lambda code to s3://$DEPLOY_BUCKET/$S3_KEY"
aws s3 cp "$LAMBDA_ZIP" "s3://$DEPLOY_BUCKET/$S3_KEY" --quiet
rm "$LAMBDA_ZIP"

# ─── Step 4: Deploy CloudFormation stack ─────────────────────────

echo "==> Deploying CloudFormation stack: $STACK_NAME"
aws cloudformation deploy \
  --template-file "$SCRIPT_DIR/aws/nowigetit.yaml" \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    DeploymentBucket="$DEPLOY_BUCKET" \
    LambdaCodeKey="$S3_KEY" \
    DomainName="$DOMAIN_NAME" \
    CertificateArn="$CERT_ARN" \
    HostedZoneId="$HOSTED_ZONE_ID" \
  --no-fail-on-empty-changeset

# ─── Step 5: Update Lambda function code (ensure latest zip) ────

echo "==> Updating Lambda function code..."
for fn_suffix in upload status process; do
  aws lambda update-function-code \
    --function-name "${STACK_NAME}-${fn_suffix}" \
    --s3-bucket "$DEPLOY_BUCKET" \
    --s3-key "$S3_KEY" \
    --region "$REGION" \
    --no-cli-pager > /dev/null
done

# ─── Step 6: Get outputs ────────────────────────────────────────

echo "==> Getting stack outputs..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text)

FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
  --output text)

CF_DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

# ─── Step 7: Upload frontend to S3 ──────────────────────────────

echo "==> Uploading frontend to s3://$FRONTEND_BUCKET"

# Generate config.js with API URL
echo "window.API_BASE = '${API_URL}';" > "$SCRIPT_DIR/backend/static/config.js"

# Upload index.html and config.js
aws s3 cp "$SCRIPT_DIR/backend/static/index.html" "s3://$FRONTEND_BUCKET/index.html" \
  --content-type "text/html" --quiet
aws s3 cp "$SCRIPT_DIR/backend/static/config.js" "s3://$FRONTEND_BUCKET/config.js" \
  --content-type "application/javascript" --quiet

# Clean up generated config.js
rm "$SCRIPT_DIR/backend/static/config.js"

# ─── Step 8: Invalidate CloudFront cache ─────────────────────────

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text > /dev/null

# ─── Done ────────────────────────────────────────────────────────

echo ""
echo "=== Deployment complete ==="
echo "  Frontend: $FRONTEND_URL"
echo "  API:      $API_URL"
echo ""
