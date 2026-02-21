"""Lambda handler: send PDF to Claude via public URL, generate HTML, publish gist."""

import os

import boto3

from generator import generate_html
from gist_publisher import create_gist

s3 = boto3.client("s3")
ssm = boto3.client("ssm")
dynamodb = boto3.resource("dynamodb")

SHAREIT_BUCKET = os.environ["SHAREIT_BUCKET"]
SHAREIT_URL = os.environ["SHAREIT_URL"]
TABLE = os.environ["JOBS_TABLE"]


def _load_secrets():
    """Fetch API keys from SSM Parameter Store (cached across warm invocations)."""
    for env_var, param_env in [
        ("ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY_PARAM"),
        ("GITHUB_TOKEN", "GITHUB_TOKEN_PARAM"),
    ]:
        if env_var not in os.environ:
            resp = ssm.get_parameter(
                Name=os.environ[param_env], WithDecryption=True
            )
            os.environ[env_var] = resp["Parameter"]["Value"]


def handler(event, context):
    _load_secrets()

    job_id = event["job_id"]
    s3_key = event["s3_key"]
    filename = event["filename"]
    table = dynamodb.Table(TABLE)

    try:
        # PDF is already in the public ShareIt bucket — just build the URL
        pdf_url = f"{SHAREIT_URL}/{s3_key}"

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
        print(f"Processing error for {job_id}: {e}")
        table.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, #e = :e",
            ExpressionAttributeNames={"#s": "status", "#e": "error"},
            ExpressionAttributeValues={":s": "error", ":e": "Processing failed."},
        )

    finally:
        # Clean up PDF from ShareIt bucket
        try:
            s3.delete_object(Bucket=SHAREIT_BUCKET, Key=s3_key)
        except Exception as cleanup_err:
            print(f"Failed to clean up S3 object {s3_key}: {cleanup_err}")
