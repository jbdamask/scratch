#!/usr/bin/env python3
"""
Simple test script for AWS S3 connector.
Expects AWS credentials to be available via environment variables:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_SESSION_TOKEN (optional)
- AWS_DEFAULT_REGION (optional, defaults to us-east-1)
"""

import os
from connectors import S3ConnectorConfig, create_connector

def test_aws_connector():
    """Test the AWS S3 connector with environment variables."""

    # Get bucket name from environment or use default
    bucket_name = os.environ.get('AWS_S3_BUCKET_NAME', 'amroja-website-277707111475-us-east-1')

    # Create S3 connector config using environment variables
    config = S3ConnectorConfig(
        bucket_name=bucket_name,
        region_name=os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'),
        # These will be picked up from environment if not explicitly set
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
        aws_session_token=os.environ.get('AWS_SESSION_TOKEN')
    )

    # Create connector
    connector = create_connector(config)

    print(f"Testing S3 connector for bucket: {bucket_name}")
    print(f"Region: {config.region_name}")

    try:
        # List files in the bucket
        print("\n--- Listing files ---")
        files = connector.list_files()
        if files:
            print(f"Found {len(files)} files:")
            for file in files[:10]:  # Show first 10 files
                print(f"  - {file}")
            if len(files) > 10:
                print(f"  ... and {len(files) - 10} more files")
        else:
            print("No files found in bucket")

        # If we have files, test getting info for the first one
        if files:
            first_file = files[0]
            print(f"\n--- Getting info for: {first_file} ---")
            file_info = connector.get_file_info(first_file)
            for key, value in file_info.items():
                print(f"  {key}: {value}")

            # Test download (to temp directory)
            print(f"\n--- Downloading: {first_file} ---")
            local_path = connector.download_file(first_file)
            print(f"Downloaded to: {local_path}")
            print(f"File size: {local_path.stat().st_size} bytes")

        print("\n✅ AWS S3 connector test completed successfully!")

    except Exception as e:
        print(f"\n❌ Error testing AWS S3 connector: {e}")
        return False

    return True

if __name__ == "__main__":
    # Check if required environment variables are set
    required_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]

    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease set these environment variables and try again.")
        exit(1)

    if not os.environ.get('AWS_S3_BUCKET_NAME'):
        print("⚠️  AWS_S3_BUCKET_NAME not set, using default amroja-website-277707111475-us-east-1t'")
        print("   Set AWS_S3_BUCKET_NAME environment variable to specify a different bucket")

    test_aws_connector()
