"""Lambda handler: return job status from DynamoDB."""

import json
import os

import boto3

dynamodb = boto3.resource("dynamodb")
TABLE = os.environ["JOBS_TABLE"]
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")


def handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    job_id = event.get("pathParameters", {}).get("job_id")
    if not job_id:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"detail": "Missing job_id."}),
        }

    table = dynamodb.Table(TABLE)
    result = table.get_item(Key={"job_id": job_id})
    item = result.get("Item")

    if not item:
        return {
            "statusCode": 404,
            "headers": headers,
            "body": json.dumps({"detail": "Job not found."}),
        }

    response = {"status": item["status"]}
    if "url" in item:
        response["url"] = item["url"]
    if "error" in item:
        response["error"] = item["error"]

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(response),
    }
