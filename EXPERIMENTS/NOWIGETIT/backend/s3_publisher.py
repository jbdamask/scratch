import os

import boto3

SHAREIT_BUCKET = os.environ.get("SHAREIT_BUCKET", "share-it-amroja")
SHAREIT_WEBSITE_URL = os.environ.get(
    "SHAREIT_WEBSITE_URL",
    "http://share-it-amroja.s3-website-us-east-1.amazonaws.com",
)

s3 = boto3.client("s3")


def publish_html(html_content: str, job_id: str) -> str:
    """Upload HTML to S3 and return the public website URL."""
    key = f"NOWIGETIT/{job_id}.html"

    s3.put_object(
        Bucket=SHAREIT_BUCKET,
        Key=key,
        Body=html_content.encode("utf-8"),
        ContentType="text/html; charset=utf-8",
    )

    return f"{SHAREIT_WEBSITE_URL}/{key}"
