"""Lambda handler: send PDF to Claude via public URL, generate HTML, publish gist."""

import os

import boto3

from generator import generate_html
from gist_publisher import create_gist

s3 = boto3.client("s3")
secrets_client = boto3.client("secretsmanager")
dynamodb = boto3.resource("dynamodb")

SHAREIT_BUCKET = os.environ["SHAREIT_BUCKET"]
SHAREIT_URL = os.environ["SHAREIT_URL"]
TABLE = os.environ["JOBS_TABLE"]


def _load_secrets():
    """Fetch API keys from Secrets Manager (cached across warm invocations)."""
    for env_var, secret_env in [
        ("ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY_ARN"),
        ("GITHUB_TOKEN", "GITHUB_TOKEN_ARN"),
    ]:
        if env_var not in os.environ:
            resp = secrets_client.get_secret_value(
                SecretId=os.environ[secret_env]
            )
            os.environ[env_var] = resp["SecretString"]


def _update_progress(table, job_id, stage):
    """Write progress_stage to DynamoDB so the frontend can show it."""
    table.update_item(
        Key={"job_id": job_id},
        UpdateExpression="SET progress_stage = :ps",
        ExpressionAttributeValues={":ps": stage},
    )


def handler(event, context):
    _load_secrets()

    job_id = event["job_id"]
    s3_key = event["s3_key"]
    filename = event["filename"]
    table = dynamodb.Table(TABLE)

    try:
        # PDF is already in the public ShareIt bucket — just build the URL
        pdf_url = f"{SHAREIT_URL}/{s3_key}"

        # Send PDF URL to Claude
        _update_progress(table, job_id, "reading")
        _update_progress(table, job_id, "generating")
        html, usage = generate_html(pdf_url)

        # Calculate costs (Claude Opus 4.6 standard pricing)
        INPUT_PRICE_PER_MTOK = 5.00
        OUTPUT_PRICE_PER_MTOK = 25.00
        input_tokens = usage["input_tokens"]
        output_tokens = usage["output_tokens"]
        input_cost = (input_tokens / 1_000_000) * INPUT_PRICE_PER_MTOK
        output_cost = (output_tokens / 1_000_000) * OUTPUT_PRICE_PER_MTOK
        total_cost = input_cost + output_cost

        # Publish to GitHub Gist
        _update_progress(table, job_id, "publishing")
        url = create_gist(html, filename)

        # Update job as complete (with usage and cost data)
        table.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, #u = :u, progress_stage = :ps, "
                "input_tokens = :it, input_tokens_cost = :itc, "
                "output_tokens = :ot, output_tokens_cost = :otc, "
                "total_cost = :tc",
            ExpressionAttributeNames={"#s": "status", "#u": "url"},
            ExpressionAttributeValues={
                ":s": "complete",
                ":u": url,
                ":ps": "complete",
                ":it": input_tokens,
                ":itc": f"{input_cost:.4f}",
                ":ot": output_tokens,
                ":otc": f"{output_cost:.4f}",
                ":tc": f"{total_cost:.4f}",
            },
        )

    except Exception as e:
        print(f"Processing error for {job_id}: {e}")
        table.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, #e = :e, progress_stage = :ps",
            ExpressionAttributeNames={"#s": "status", "#e": "error"},
            ExpressionAttributeValues={":s": "error", ":e": "Processing failed.", ":ps": "error"},
        )

    finally:
        # Clean up PDF from ShareIt bucket
        try:
            s3.delete_object(Bucket=SHAREIT_BUCKET, Key=s3_key)
        except Exception as cleanup_err:
            print(f"Failed to clean up S3 object {s3_key}: {cleanup_err}")
