"""Lambda handler: send PDF to Claude via public URL, generate HTML, publish gist."""

import os

import boto3

from generator import generate_html
from gist_publisher import create_gist

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

PDF_BUCKET = os.environ["PDF_BUCKET"]
TABLE = os.environ["JOBS_TABLE"]
SHAREIT_BUCKET = os.environ["SHAREIT_BUCKET"]
SHAREIT_URL = os.environ["SHAREIT_URL"]


def handler(event, context):
    job_id = event["job_id"]
    s3_key = event["s3_key"]
    filename = event["filename"]
    table = dynamodb.Table(TABLE)
    public_key = f"nowigetit/{job_id}.pdf"

    try:
        # Copy PDF to public ShareIt bucket so Claude can fetch it by URL
        s3.copy_object(
            CopySource={"Bucket": PDF_BUCKET, "Key": s3_key},
            Bucket=SHAREIT_BUCKET,
            Key=public_key,
            ContentType="application/pdf",
        )
        pdf_url = f"{SHAREIT_URL}/{public_key}"

        # Send URL to Claude and generate HTML
        html = generate_html(pdf_url)

        # Publish to GitHub Gist
        url = create_gist(html, filename)

        # Update job as complete
        table.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, #u = :u",
            ExpressionAttributeNames={"#s": "status", "#u": "url"},
            ExpressionAttributeValues={":s": "complete", ":u": url},
        )

    except Exception as e:
        table.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, #e = :e",
            ExpressionAttributeNames={"#s": "status", "#e": "error"},
            ExpressionAttributeValues={":s": "error", ":e": str(e)},
        )

    finally:
        # Clean up PDFs from both buckets
        s3.delete_object(Bucket=PDF_BUCKET, Key=s3_key)
        s3.delete_object(Bucket=SHAREIT_BUCKET, Key=public_key)
