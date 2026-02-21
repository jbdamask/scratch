"""Lambda handler: receive PDF upload, store in S3, kick off processing."""

import base64
import json
import os
import time
import uuid

import boto3

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
lambda_client = boto3.client("lambda")

SHAREIT_BUCKET = os.environ["SHAREIT_BUCKET"]
TABLE = os.environ["JOBS_TABLE"]
PROCESSOR_FN = os.environ["PROCESSOR_FUNCTION_NAME"]
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")


def handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    try:
        content_type = event.get("headers", {}).get("content-type", "")

        if "multipart/form-data" not in content_type:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"detail": "Expected multipart/form-data."}),
            }

        body = event.get("body", "")
        is_base64 = event.get("isBase64Encoded", False)

        if is_base64:
            body_bytes = base64.b64decode(body)
        else:
            body_bytes = body.encode("utf-8")

        # Parse multipart form data to extract the PDF
        filename, pdf_bytes = _parse_multipart(content_type, body_bytes)

        if not filename.lower().endswith(".pdf"):
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"detail": "Only PDF files are accepted."}),
            }

        if len(pdf_bytes) > 10 * 1024 * 1024:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"detail": "File too large. 10 MB max."}),
            }

        job_id = str(uuid.uuid4())

        # Store PDF in public ShareIt bucket (Claude fetches by URL)
        s3_key = f"nowigetit/{job_id}.pdf"
        s3.put_object(
            Bucket=SHAREIT_BUCKET,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )

        # Create job record in DynamoDB (TTL: 24 hours)
        table = dynamodb.Table(TABLE)
        table.put_item(
            Item={
                "job_id": job_id,
                "status": "processing",
                "filename": filename,
                "s3_key": s3_key,
                "ttl": int(time.time()) + 86400,
            }
        )

        # Invoke processing Lambda async
        lambda_client.invoke(
            FunctionName=PROCESSOR_FN,
            InvocationType="Event",
            Payload=json.dumps({"job_id": job_id, "s3_key": s3_key, "filename": filename}),
        )

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"job_id": job_id}),
        }

    except Exception as e:
        print(f"Upload error: {e}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"detail": "Upload failed. Please try again."}),
        }


def _parse_multipart(content_type: str, body: bytes) -> tuple[str, bytes]:
    """Extract filename and file bytes from multipart/form-data."""
    boundary = content_type.split("boundary=")[-1].strip()
    parts = body.split(f"--{boundary}".encode())

    for part in parts:
        if b"filename=" not in part:
            continue

        header_end = part.find(b"\r\n\r\n")
        if header_end == -1:
            continue

        header = part[:header_end].decode("utf-8", errors="replace")
        file_data = part[header_end + 4 :]

        # Strip trailing \r\n-- if present
        if file_data.endswith(b"\r\n"):
            file_data = file_data[:-2]
        if file_data.endswith(b"--"):
            file_data = file_data[:-2]
        if file_data.endswith(b"\r\n"):
            file_data = file_data[:-2]

        # Extract filename from Content-Disposition header
        for line in header.split("\r\n"):
            if "filename=" in line:
                filename = line.split('filename="')[1].split('"')[0]
                filename = os.path.basename(filename)
                return filename, file_data

    raise ValueError("No file found in upload.")
