"""
ShareIt Lambda Handler

Generates presigned S3 upload URLs for authorized origins.
Validates origin, filename, and handles collisions.
"""

import json
import os
import re
import time
import logging
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

# Environment variables (all required - no defaults)
BUCKET = os.environ['S3_BUCKET']
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', '').split(',') if o.strip()]
ALLOWED_IPS = [ip.strip() for ip in os.environ.get('ALLOWED_IPS', '').split(',') if ip.strip()]
WEBSITE_ENDPOINT = os.environ['WEBSITE_ENDPOINT']
PRESIGN_EXPIRY = int(os.environ.get('PRESIGN_EXPIRY', 20))

# Filename validation regex
FILENAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,100}$')


def handler(event, context):
    """Main Lambda handler for ShareIt presigned URL generation."""

    # Handle OPTIONS preflight
    if event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return cors_response(200, {}, '*')

    # Extract origin and source IP
    headers = event.get('headers', {})
    origin = headers.get('origin', '')
    source_ip = event.get('requestContext', {}).get('http', {}).get('sourceIp', '')

    # Validate origin
    if not is_origin_allowed(origin, source_ip):
        log_event('upload_rejected', origin, source_ip, reason='INVALID_ORIGIN')
        return cors_response(403, {
            'error': 'Forbidden',
            'code': 'INVALID_ORIGIN'
        }, origin)

    # Parse request body
    try:
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename', '')
    except json.JSONDecodeError:
        return cors_response(400, {
            'error': 'Invalid JSON',
            'code': 'INVALID_REQUEST'
        }, origin)

    # Validate filename
    if not filename or not FILENAME_PATTERN.match(filename):
        return cors_response(400, {
            'error': 'Invalid filename. Use only letters, numbers, hyphens, and underscores (max 100 chars).',
            'code': 'INVALID_FILENAME'
        }, origin)

    # Check for collision and determine final key
    key = f'{filename}.html'
    collision = False

    if object_exists(key):
        collision = True
        timestamp = int(time.time())
        key = f'{filename}-{timestamp}.html'

    # Generate presigned URL
    try:
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET,
                'Key': key,
                'ContentType': 'text/html'
            },
            ExpiresIn=PRESIGN_EXPIRY
        )
    except ClientError as e:
        logger.error(f'S3 presigned URL error: {e}')
        return cors_response(500, {
            'error': 'Failed to generate upload URL',
            'code': 'S3_ERROR'
        }, origin)

    public_url = f'{WEBSITE_ENDPOINT}/{key}'

    # Log successful authorization
    log_event('upload_authorized', origin, source_ip, filename=key, collision=collision)

    return cors_response(200, {
        'presignedUrl': presigned_url,
        'finalFilename': key,
        'publicUrl': public_url
    }, origin)


def is_origin_allowed(origin, source_ip):
    """
    Check if the request origin is allowed.

    Production origins are checked against ALLOWED_ORIGINS.
    Localhost origins are allowed only if source IP is in ALLOWED_IPS.
    """
    if not origin:
        return False

    # Check production origins
    if origin in ALLOWED_ORIGINS:
        return True

    # Check localhost with IP validation
    if origin.startswith('http://localhost') or origin.startswith('http://127.0.0.1'):
        return source_ip in ALLOWED_IPS

    return False


def object_exists(key):
    """Check if an object exists in the S3 bucket."""
    try:
        s3.head_object(Bucket=BUCKET, Key=key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        # Re-raise unexpected errors
        raise


def log_event(event_type, origin, source_ip, filename=None, collision=None, reason=None):
    """Log structured event data."""
    log_data = {
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'event': event_type,
        'origin': origin,
        'source_ip': source_ip
    }

    if filename:
        log_data['filename'] = filename
    if collision is not None:
        log_data['collision'] = collision
    if reason:
        log_data['reason'] = reason

    logger.info(json.dumps(log_data))


def cors_response(status_code, body, origin=None):
    """Build response with CORS headers."""
    # Use specific origin if provided and valid, otherwise use wildcard
    cors_origin = origin if origin else '*'

    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': cors_origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(body)
    }
