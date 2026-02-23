import os

import boto3

PUBLISH_BUCKET = os.environ.get("PUBLISH_BUCKET", "share-it-amroja")
PUBLISH_URL = os.environ.get("PUBLISH_URL", "http://share-it-amroja.s3-website-us-east-1.amazonaws.com")

s3 = boto3.client("s3")


def publish_html(html_content: str, job_id: str) -> str:
    """Upload HTML to S3 and return the public URL."""
    key = f"pages/{job_id}.html"

    s3.put_object(
        Bucket=PUBLISH_BUCKET,
        Key=key,
        Body=html_content.encode("utf-8"),
        ContentType="text/html; charset=utf-8",
    )

    return f"{PUBLISH_URL}/{key}"
