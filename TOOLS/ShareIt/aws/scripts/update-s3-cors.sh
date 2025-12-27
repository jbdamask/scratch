#!/bin/bash
# update-s3-cors.sh
# Updates the S3 bucket CORS configuration for ShareIt uploads

# All parameters are required
if [ $# -lt 2 ]; then
    echo "Usage: $0 <bucket-name> <region>"
    echo "Example: $0 my-shared-pages us-east-1"
    exit 1
fi

BUCKET_NAME="$1"
REGION="$2"

echo "Updating CORS configuration for bucket: $BUCKET_NAME"

# Create CORS configuration JSON
CORS_CONFIG=$(cat <<'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedOrigins": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF
)

# Apply CORS configuration
aws s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration "$CORS_CONFIG" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "CORS configuration updated successfully"
    echo ""
    echo "Current CORS configuration:"
    aws s3api get-bucket-cors --bucket "$BUCKET_NAME" --region "$REGION"
else
    echo "Failed to update CORS configuration"
    exit 1
fi
