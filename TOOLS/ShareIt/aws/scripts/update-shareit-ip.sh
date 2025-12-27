#!/bin/bash
# update-shareit-ip.sh
# Updates the ShareIt Lambda with your current public IP

# All parameters are required
if [ $# -lt 2 ]; then
    echo "Usage: $0 <lambda-function-name> <region>"
    echo "Example: $0 my-shareit-lambda us-east-1"
    exit 1
fi

LAMBDA_NAME="$1"
REGION="$2"

# Get current public IP
CURRENT_IP=$(curl -s https://checkip.amazonaws.com)

if [ -z "$CURRENT_IP" ]; then
    echo "Failed to get current IP"
    exit 1
fi

echo "Current IP: $CURRENT_IP"

# Get existing env vars
EXISTING=$(aws lambda get-function-configuration \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    --query 'Environment.Variables' \
    --output json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Failed to get Lambda configuration. Is the function deployed?"
    exit 1
fi

# Update ALLOWED_IPS while preserving other vars
UPDATED=$(echo "$EXISTING" | jq --arg ip "$CURRENT_IP" '. + {ALLOWED_IPS: $ip}')

# Apply update
aws lambda update-function-configuration \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    --environment "Variables=$UPDATED" \
    --output text \
    --query 'Environment.Variables.ALLOWED_IPS'

if [ $? -eq 0 ]; then
    echo "Updated ALLOWED_IPS to: $CURRENT_IP"
else
    echo "Failed to update Lambda configuration"
    exit 1
fi
