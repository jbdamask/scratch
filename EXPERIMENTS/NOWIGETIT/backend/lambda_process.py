"""Lambda handler: extract text from PDF, generate HTML via Claude, publish gist."""

import os

import boto3

from pdf_processor import extract_text
from generator import generate_html
from gist_publisher import create_gist

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

BUCKET = os.environ["PDF_BUCKET"]
TABLE = os.environ["JOBS_TABLE"]


def handler(event, context):
    job_id = event["job_id"]
    s3_key = event["s3_key"]
    filename = event["filename"]
    table = dynamodb.Table(TABLE)

    try:
        # Fetch PDF from S3
        response = s3.get_object(Bucket=BUCKET, Key=s3_key)
        pdf_bytes = response["Body"].read()

        # Extract text
        text = extract_text(pdf_bytes)

        # Generate HTML via Claude
        html = generate_html(text)

        # Publish to GitHub Gist
        url = create_gist(html, filename)

        # Update job as complete
        table.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, #u = :u",
            ExpressionAttributeNames={"#s": "status", "#u": "url"},
            ExpressionAttributeValues={":s": "complete", ":u": url},
        )

        # Clean up PDF from S3
        s3.delete_object(Bucket=BUCKET, Key=s3_key)

    except Exception as e:
        table.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, #e = :e",
            ExpressionAttributeNames={"#s": "status", "#e": "error"},
            ExpressionAttributeValues={":s": "error", ":e": str(e)},
        )
