#!/bin/bash
# add-allowed-origin.sh
# Adds an origin to the ShareIt Lambda URL CORS and environment variable

set -e

if [ $# -lt 3 ]; then
    echo "Usage: $0 <lambda-function-name> <region> <origin> [aws-profile]"
    echo "Example: $0 my-shareit-lambda us-east-1 http://localhost:5173"
    echo "Example: $0 my-shareit-lambda us-east-1 http://localhost:5173 my-aws-profile"
    exit 1
fi

LAMBDA_NAME="$1"
REGION="$2"
NEW_ORIGIN="$3"
PROFILE_ARG=""
if [ -n "$4" ]; then
    PROFILE_ARG="--profile $4"
fi

echo "Adding origin: $NEW_ORIGIN"

# Get current Lambda URL CORS config
echo "Fetching current CORS config..."
CURRENT_CORS=$(aws lambda get-function-url-config \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    $PROFILE_ARG \
    --query 'Cors' \
    --output json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Failed to get Lambda URL config. Is the function URL configured?"
    exit 1
fi

# Extract current origins and check for duplicate
CURRENT_ORIGINS=$(echo "$CURRENT_CORS" | jq -r '.AllowOrigins // []')
if echo "$CURRENT_ORIGINS" | jq -e --arg o "$NEW_ORIGIN" 'index($o) != null' > /dev/null 2>&1; then
    echo "Origin '$NEW_ORIGIN' already exists in CORS config"
else
    # Add new origin to CORS
    UPDATED_ORIGINS=$(echo "$CURRENT_ORIGINS" | jq --arg o "$NEW_ORIGIN" '. + [$o]')
    ALLOW_METHODS=$(echo "$CURRENT_CORS" | jq -r '.AllowMethods // ["POST", "OPTIONS"] | join(",")')
    ALLOW_HEADERS=$(echo "$CURRENT_CORS" | jq -r '.AllowHeaders // ["Content-Type"] | join(",")')
    ORIGINS_CSV=$(echo "$UPDATED_ORIGINS" | jq -r 'join(",")')

    echo "Updating Lambda URL CORS..."
    aws lambda update-function-url-config \
        --function-name "$LAMBDA_NAME" \
        --region "$REGION" \
        $PROFILE_ARG \
        --cors "AllowOrigins=$ORIGINS_CSV,AllowMethods=$ALLOW_METHODS,AllowHeaders=$ALLOW_HEADERS" \
        --output text \
        --query 'Cors.AllowOrigins' > /dev/null

    echo "CORS updated"
fi

# Get existing env vars
echo "Fetching current environment variables..."
EXISTING_ENV=$(aws lambda get-function-configuration \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    $PROFILE_ARG \
    --query 'Environment.Variables' \
    --output json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Failed to get Lambda configuration"
    exit 1
fi

# Get current ALLOWED_ORIGINS
CURRENT_ALLOWED=$(echo "$EXISTING_ENV" | jq -r '.ALLOWED_ORIGINS // ""')

# Check if origin already exists in env var
if echo "$CURRENT_ALLOWED" | grep -qF "$NEW_ORIGIN"; then
    echo "Origin '$NEW_ORIGIN' already exists in ALLOWED_ORIGINS env var"
else
    # Add new origin
    if [ -z "$CURRENT_ALLOWED" ]; then
        NEW_ALLOWED="$NEW_ORIGIN"
    else
        NEW_ALLOWED="$CURRENT_ALLOWED,$NEW_ORIGIN"
    fi

    # Update env vars preserving others (use -c for compact single-line JSON)
    UPDATED_ENV=$(echo "$EXISTING_ENV" | jq -c --arg origins "$NEW_ALLOWED" '. + {ALLOWED_ORIGINS: $origins}')

    # Wrap in {"Variables": ...} structure for AWS CLI
    ENV_JSON=$(echo "$UPDATED_ENV" | jq -c '{Variables: .}')

    echo "Updating Lambda environment..."
    aws lambda update-function-configuration \
        --function-name "$LAMBDA_NAME" \
        --region "$REGION" \
        $PROFILE_ARG \
        --environment "$ENV_JSON" \
        --output text \
        --query 'Environment.Variables.ALLOWED_ORIGINS' > /dev/null

    echo "Environment updated"
fi

echo ""
echo "Done! Added origin: $NEW_ORIGIN"
echo ""
echo "Current allowed origins:"
aws lambda get-function-url-config \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    $PROFILE_ARG \
    --query 'Cors.AllowOrigins' \
    --output yaml
