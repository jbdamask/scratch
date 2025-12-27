#!/bin/bash
# deploy-sharejs.sh
# Deploys share.js to S3 bucket with the correct Lambda endpoint

set -e

# All parameters are required except profile
if [ $# -lt 3 ]; then
    echo "Usage: $0 <bucket-name> <lambda-function-name> <region> [aws-profile]"
    echo "Example: $0 my-shared-pages my-shareit-lambda us-east-1"
    echo "Example: $0 my-shared-pages my-shareit-lambda us-east-1 my-aws-profile"
    exit 1
fi

BUCKET_NAME="$1"
LAMBDA_NAME="$2"
REGION="$3"
PROFILE_ARG=""
if [ -n "$4" ]; then
    PROFILE_ARG="--profile $4"
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARE_JS="$SCRIPT_DIR/../../share.js"

echo "Fetching Lambda Function URL..."
LAMBDA_URL=$(aws lambda get-function-url-config \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    $PROFILE_ARG \
    --query 'FunctionUrl' \
    --output text 2>/dev/null)

if [ -z "$LAMBDA_URL" ] || [ "$LAMBDA_URL" == "None" ]; then
    echo "Error: Could not get Lambda Function URL. Is the stack deployed?"
    exit 1
fi

echo "Lambda URL: $LAMBDA_URL"

# Create temp file with updated endpoint
TEMP_FILE=$(mktemp)
sed "s|%%LAMBDA_ENDPOINT%%|$LAMBDA_URL|g" "$SHARE_JS" > "$TEMP_FILE"

echo "Uploading share.js to s3://$BUCKET_NAME/share.js..."
aws s3 cp "$TEMP_FILE" "s3://$BUCKET_NAME/share.js" \
    --content-type "application/javascript" \
    --region "$REGION" \
    $PROFILE_ARG

rm "$TEMP_FILE"

echo ""
echo "Deployment complete!"
echo "share.js is now available at:"
echo "  https://$BUCKET_NAME.s3.$REGION.amazonaws.com/share.js"
echo ""
echo "Integration code:"
echo '  <script src="https://'"$BUCKET_NAME"'.s3.'"$REGION"'.amazonaws.com/share.js"></script>'
echo '  <button onclick="ShareIt.share()">Share</button>'
